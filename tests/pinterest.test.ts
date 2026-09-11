import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealSecret, openSecret } from "../src/lib/secret-box";
import {
  exchangeToken,
  pinterestRequest,
  scopes,
  PinterestError,
  callbackUrl,
} from "../src/services/pinterest-api";
const request = vi.fn();
beforeEach(() => {
  vi.stubEnv("APP_ENCRYPTION_KEY", "ab".repeat(32));
  vi.stubEnv("PINTEREST_CLIENT_ID", "test-client");
  vi.stubEnv("PINTEREST_CLIENT_SECRET", "test-secret");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", request);
  request.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("encrypted platform credentials", () => {
  it("round trips with random IVs and hides plaintext", () => {
    const a = sealSecret("test-token", "pinterest:access"),
      b = sealSecret("test-token", "pinterest:access");
    expect(a).not.toBe(b);
    expect(a).not.toContain("test-token");
    expect(openSecret(a, "pinterest:access")).toBe("test-token");
  });
  it("rejects substitution, tampering, and wrong keys", () => {
    const a = sealSecret("test-token", "pinterest:access");
    expect(() => openSecret(a, "pinterest:refresh")).toThrow();
    const bits = a.split(".");
    bits[3] = Buffer.from("tampered").toString("base64url");
    expect(() => openSecret(bits.join("."), "pinterest:access")).toThrow();
    vi.stubEnv("APP_ENCRYPTION_KEY", "cd".repeat(32));
    expect(() => openSecret(a, "pinterest:access")).toThrow();
  });
  it("fails closed when encryption is unconfigured", () => {
    vi.stubEnv("APP_ENCRYPTION_KEY", "");
    expect(() => sealSecret("value", "context")).toThrow();
  });
});
describe("Pinterest API transport", () => {
  it("requests tokens with Basic auth and validates permissions", async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "test",
          refresh_token: "refresh",
          expires_in: 3600,
          scope: scopes.join(" "),
          token_type: "bearer",
        }),
      ),
    );
    expect(
      (
        await exchangeToken(
          new URLSearchParams({
            grant_type: "authorization_code",
            code: "test-code",
          }),
        )
      ).access_token,
    ).toBe("test");
    expect(request.mock.calls[0][0]).toBe(
      "https://api.pinterest.com/v5/oauth/token",
    );
    expect(request.mock.calls[0][1].redirect).toBe("error");
    expect(request.mock.calls[0][1].headers.Authorization).toMatch(/^Basic /);
  });
  it("rejects missing required permissions", async () => {
    request.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "test",
          expires_in: 3600,
          scope: "boards:read",
          token_type: "bearer",
        }),
      ),
    );
    await expect(exchangeToken(new URLSearchParams())).rejects.toThrow(
      "permissions",
    );
  });
  it("does not auto retry an uncertain publish response", async () => {
    request.mockRejectedValue(Error("sensitive transport detail"));
    await expect(
      pinterestRequest("/pins", { method: "POST" }, true),
    ).rejects.toMatchObject({
      uncertain: true,
      retryable: false,
      message: "Pinterest request failed",
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("treats rate limiting as a definite retryable rejection", async () => {
    request.mockResolvedValue(new Response("private payload", { status: 429 }));
    await expect(
      pinterestRequest("/pins", { method: "POST" }, true),
    ).rejects.toMatchObject({ uncertain: false, retryable: true });
  });
  it("treats server errors and malformed success as uncertain", async () => {
    request.mockResolvedValue(new Response("error", { status: 503 }));
    await expect(pinterestRequest("/pins", {}, true)).rejects.toMatchObject({
      uncertain: true,
    });
    request.mockResolvedValue(new Response("not json"));
    await expect(pinterestRequest("/pins", {}, true)).rejects.toBeInstanceOf(
      PinterestError,
    );
  });
  it("rejects unencrypted remote callbacks", () => {
    expect(callbackUrl()).toBe("http://localhost:3000/api/pinterest/callback");
    vi.stubEnv("APP_URL", "http://example.com");
    expect(callbackUrl).toThrow();
  });
});
