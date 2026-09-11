import { test, expect } from "@playwright/test";
test("public bookstore, language persistence, journal and private workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A little less noise.",
  );
  await expect(page.getByText("Workflow verification")).toHaveCount(0);
  await page.getByRole("link", { name: "Switch to Romanian" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Mai puțin zgomot.",
  );
  await page
    .getByRole("navigation", { name: "Navigare librărie" })
    .getByRole("link", { name: "Jurnal", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Jurnalul",
  );
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Un colț mic. O lume întreagă." }),
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lasă lectura să aibă ritmul ei" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(
    page.getByRole("heading", { name: "Let reading find its own pace" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "How to create a cozy reading corner at home",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  const missing = await page.goto("/blog/not-a-real-article");
  expect(missing?.status()).toBe(404);
});
