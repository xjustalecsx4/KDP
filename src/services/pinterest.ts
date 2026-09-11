import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { sealSecret, openSecret } from "@/lib/secret-box";
import { ActionError } from "@/lib/policies";
import { queueTransaction } from "./jobs";
import { audit } from "./events";
import {
  scopes,
  callbackUrl,
  pinterestConfigured,
  exchangeToken,
  readProfile,
  boardsSchema,
  pinterestRequest,
} from "./pinterest-api";
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function beginPinterest(userId: string, sessionId: string) {
  if (!pinterestConfigured())
    throw new ActionError(
      "Pinterest is awaiting app approval and server credentials.",
    );
  const state = randomBytes(32).toString("base64url");
  await db.$transaction(async (tx) => {
    await tx.verification.deleteMany({
      where: {
        identifier: { startsWith: "pinterest:" },
        expiresAt: { lt: new Date() },
      },
    });
    await tx.verification.create({
      data: {
        id: randomUUID(),
        identifier: "pinterest:" + digest(state),
        value: digest(userId + ":" + sessionId),
        expiresAt: new Date(Date.now() + 600000),
      },
    });
  });
  const url = new URL("https://www.pinterest.com/oauth/");
  url.search = new URLSearchParams({
    client_id: process.env.PINTEREST_CLIENT_ID!,
    redirect_uri: callbackUrl(),
    response_type: "code",
    scope: scopes.join(","),
    state,
  }).toString();
  return { url: url.href, state };
}
export async function completePinterest(
  state: string,
  code: string,
  userId: string,
  sessionId: string,
) {
  const consumed = await db.verification.deleteMany({
    where: {
      identifier: "pinterest:" + digest(state),
      value: digest(userId + ":" + sessionId),
      expiresAt: { gt: new Date() },
    },
  });
  if (consumed.count !== 1)
    throw new ActionError("OAuth session expired. Start connecting again.");
  const tokens = await exchangeToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
    }),
  );
  const profile = await readProfile(tokens.access_token);
  await queueTransaction(async (tx) => {
    const previous = await tx.platformAccount.findUnique({
      where: { platform: "PINTEREST" },
    });
    if (
      previous &&
      (await tx.scheduledPost.count({
        where: {
          platform: "PINTEREST",
          OR: [
            { status: { in: ["SCHEDULED", "PUBLISHING"] } },
            { job: { is: { requiresReconciliation: true } } },
          ],
        },
      }))
    )
      throw new ActionError("Resolve pending schedules before reconnecting.");
    const data = {
      connected: true,
      displayName: profile.username,
      externalAccountId: profile.username,
      encryptedAccessToken: sealSecret(tokens.access_token, "pinterest:access"),
      encryptedRefreshToken: tokens.refresh_token
        ? sealSecret(tokens.refresh_token, "pinterest:refresh")
        : null,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      lastSuccessfulRequestAt: new Date(),
      lastError: null,
    };
    await tx.platformAccount.upsert({
      where: { platform: "PINTEREST" },
      create: { platform: "PINTEREST", ...data },
      update: data,
    });
    await tx.appSetting.deleteMany({ where: { key: "pinterest-boards" } });
    await audit(tx, "PLATFORM_CONNECTED", {
      actorId: userId,
      platform: "PINTEREST",
    });
  });
}
export async function pinterestToken() {
  // Serialize rotation with disconnect/reconnect across processes; token never reaches the browser.
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7312401)`;
      const account = await tx.platformAccount.findUnique({
        where: { platform: "PINTEREST" },
      });
      if (!account?.connected || !account.encryptedAccessToken)
        throw new ActionError("Connect Pinterest first.");
      if (
        account.tokenExpiresAt &&
        account.tokenExpiresAt.getTime() > Date.now() + 120000
      )
        return openSecret(account.encryptedAccessToken, "pinterest:access");
      if (!account.encryptedRefreshToken)
        throw new ActionError("Reconnect Pinterest to renew access.");
      const tokens = await exchangeToken(
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: openSecret(
            account.encryptedRefreshToken,
            "pinterest:refresh",
          ),
        }),
      );
      await tx.platformAccount.update({
        where: { id: account.id },
        data: {
          encryptedAccessToken: sealSecret(
            tokens.access_token,
            "pinterest:access",
          ),
          encryptedRefreshToken: tokens.refresh_token
            ? sealSecret(tokens.refresh_token, "pinterest:refresh")
            : account.encryptedRefreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          lastSuccessfulRequestAt: new Date(),
        },
      });
      return tokens.access_token;
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
export async function syncPinterest(actorId: string) {
  try {
    const token = await pinterestToken();
    const profile = await readProfile(token);
    const boards: { id: string; name: string }[] = [];
    let bookmark: string | undefined;
    for (let page = 0; page < 10; page++) {
      const query = new URLSearchParams({ page_size: "100" });
      if (bookmark) query.set("bookmark", bookmark);
      const result = boardsSchema.parse(
        await pinterestRequest("/boards?" + query, {
          headers: { Authorization: "Bearer " + token },
        }),
      );
      boards.push(...result.items);
      bookmark = result.bookmark ?? undefined;
      if (!bookmark) break;
    }
    await queueTransaction(async (tx) => {
      const current = await tx.platformAccount.findUnique({
        where: { platform: "PINTEREST" },
      });
      if (!current?.connected || current.externalAccountId !== profile.username)
        throw new ActionError("Account changed; synchronize again.");
      await tx.platformAccount.update({
        where: { id: current.id },
        data: {
          displayName: profile.username,
          lastSuccessfulRequestAt: new Date(),
          lastSyncAt: new Date(),
          lastError: null,
        },
      });
      await tx.appSetting.upsert({
        where: { key: "pinterest-boards" },
        create: { key: "pinterest-boards", value: { items: boards } },
        update: { value: { items: boards } },
      });
      await audit(tx, "PLATFORM_TESTED", { actorId, platform: "PINTEREST" });
    });
  } catch {
    await db.platformAccount.updateMany({
      where: { platform: "PINTEREST" },
      data: { lastError: "PLATFORM_FAILED" },
    });
    throw new ActionError(
      "Pinterest connection failed. Check app approval, credentials and permissions.",
    );
  }
}
