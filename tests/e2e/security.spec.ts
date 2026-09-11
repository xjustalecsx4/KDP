import { test, expect } from "@playwright/test";
test("strict security headers, fresh nonces, and cross-origin mutation rejection", async ({
  request,
  page,
}) => {
  const first = await request.get("/");
  const second = await request.get("/");
  expect(first.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(first.headers()["content-security-policy"]).toContain(
    "object-src 'none'",
  );
  expect(first.headers()["content-security-policy"]).not.toBe(
    second.headers()["content-security-policy"],
  );
  expect(first.headers()["x-powered-by"]).toBeUndefined();
  const blocked = await request.post("/api/auth/sign-in/email", {
    headers: { origin: "https://untrusted.example" },
    data: { email: "test@example.test", password: "not-a-real-password" },
  });
  expect(blocked.status()).toBe(403);
  const callback = await request.get(
    "/api/pinterest/callback?code=not-a-secret&state=invalid",
    { maxRedirects: 0 },
  );
  expect([303, 307]).toContain(callback.status());
  expect(callback.headers().location).toContain("/login");
  await page.goto("/");
  await page.getByRole("link", { name: "Switch to Romanian" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Mai puțin",
  );
});
