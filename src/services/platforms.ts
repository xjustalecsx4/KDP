import { db } from "@/lib/db";
import { queueTransaction } from "./jobs";
import { ActionError } from "@/lib/policies";
import { audit } from "./events";
export const platformSelect = {
  id: true,
  platform: true,
  connected: true,
  displayName: true,
  externalAccountId: true,
  tokenExpiresAt: true,
  lastSuccessfulRequestAt: true,
  lastSyncAt: true,
} as const;
export async function getPlatforms() {
  const records = await db.platformAccount.findMany({
    select: { ...platformSelect, lastError: true },
  });
  const rows = records.map(({ lastError, ...safe }) => ({
    ...safe,
    hasError: Boolean(lastError),
  }));
  return ["PINTEREST", "TIKTOK"].map((platform) => ({
    platform,
    account: rows.find((row) => row.platform === platform),
  }));
}
export async function disconnectPlatform(
  platform: "PINTEREST" | "TIKTOK",
  actorId: string,
) {
  return queueTransaction(async (tx) => {
    const pending = await tx.scheduledPost.count({
      where: {
        platform,
        OR: [
          { status: { in: ["SCHEDULED", "PUBLISHING"] } },
          {
            job: {
              is: {
                OR: [
                  { status: "PROCESSING" },
                  { criticalOperation: true },
                  { requiresReconciliation: true },
                ],
              },
            },
          },
        ],
      },
    });
    if (pending)
      throw new ActionError(
        "Cancel pending schedules and wait for publishing to finish before disconnecting.",
      );
    await tx.platformAccount.updateMany({
      where: { platform },
      data: {
        connected: false,
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        tokenExpiresAt: null,
      },
    });
    await audit(tx, "PLATFORM_DISCONNECTED", { actorId, platform });
  });
}
// Providers deliberately remain unavailable until their approved implementation phase.
// Never simulate a successful connection or API test.
export const providerUnavailable =
  "Official API integration is not implemented in this milestone. Connection and publishing are unavailable.";
