import { z } from "zod";
import { ActionError } from "@/lib/policies";
export const scopes = [
  "user_accounts:read",
  "boards:read",
  "boards:write",
  "pins:read",
  "pins:write",
];
export function pinterestConfigured() {
  return (
    !!process.env.PINTEREST_CLIENT_ID &&
    !!process.env.PINTEREST_CLIENT_SECRET &&
    /^[a-fA-F0-9]{64}$/.test(process.env.APP_ENCRYPTION_KEY ?? "") &&
    !!process.env.APP_URL
  );
}
export function callbackUrl() {
  const url = new URL(process.env.APP_URL ?? "http://localhost:3000");
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new ActionError("Pinterest requires HTTPS except on localhost.");
  return new URL("/api/pinterest/callback", url).href;
}
export class PinterestError extends Error {
  constructor(
    public readonly uncertain: boolean,
    public readonly retryable: boolean,
  ) {
    super("Pinterest request failed");
  }
}
export async function pinterestRequest(
  endpoint: string,
  init: RequestInit = {},
  publishing = false,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("https://api.pinterest.com/v5" + endpoint, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
  } catch {
    throw new PinterestError(publishing, false);
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new PinterestError(
      publishing && response.status >= 500,
      response.status === 429,
    );
  }
  try {
    const reader = response.body?.getReader();
    if (!reader) throw Error();
    let total = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 2_000_000) {
        await reader.cancel();
        throw Error();
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new PinterestError(publishing, false);
  }
}
export const tokenSchema = z.object({
  access_token: z.string().min(1).max(16000),
  refresh_token: z.string().min(1).max(16000).optional(),
  expires_in: z.number().int().positive(),
  scope: z.string(),
  token_type: z.string(),
});
export async function exchangeToken(body: URLSearchParams) {
  if (!pinterestConfigured())
    throw new ActionError(
      "Configure Pinterest credentials and encryption on the server first.",
    );
  const result = tokenSchema.parse(
    await pinterestRequest("/oauth/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.PINTEREST_CLIENT_ID +
              ":" +
              process.env.PINTEREST_CLIENT_SECRET,
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }),
  );
  if (!scopes.every((s) => result.scope.split(/[ ,]+/).includes(s)))
    throw new ActionError("Required Pinterest permissions were not granted.");
  return result;
}
export const profileSchema = z.object({ username: z.string().min(1).max(200) });
export const boardSchema = z.object({
  id: z.string().regex(/^\d+$/),
  name: z.string().max(200),
});
export const boardsSchema = z.object({
  items: z.array(boardSchema).max(1000),
  bookmark: z.string().nullable().optional(),
});
export async function readProfile(token: string) {
  return profileSchema.parse(
    await pinterestRequest("/user_account", {
      headers: { Authorization: "Bearer " + token },
    }),
  );
}
