import { expect, test } from "@playwright/test";
const email = process.env.TEST_ADMIN_EMAIL;
const password = process.env.TEST_ADMIN_PASSWORD;
test("private administration, navigation, settings, and confirmation", async ({
  page,
}) => {
  test.skip(
    !email || !password,
    "Provide a disposable administrator through TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD.",
  );
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "System overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveText([
    "Dashboard",
    "Books",
    "Create Content",
    "Content Queue",
    "Calendar",
    "Templates",
    "Analytics",
    "Admin",
    "Settings",
  ]);
  for (const [route, heading] of [
    ["jobs", "Job management"],
    ["scheduler", "Scheduler management"],
    ["platforms", "Platform connections"],
    ["storage", "Storage management"],
    ["logs", "System logs"],
    ["health", "System health"],
    ["settings", "Operational configuration"],
    ["account", "Administrator account"],
  ]) {
    await page.goto(`/admin/${route}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
  await page.goto("/admin/settings");
  const original = await page.getByLabel("Default timezone").inputValue();
  await page.getByLabel("Default timezone").fill("Europe/Bucharest");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Changes saved successfully.",
  );
  await page.reload();
  await expect(page.getByLabel("Default timezone")).toHaveValue(
    "Europe/Bucharest",
  );
  await page.getByLabel("Default timezone").fill(original);
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Changes saved successfully.",
  );
  await page.goto("/admin/storage");
  await page
    .getByRole("button", { name: "Clean up", exact: true })
    .first()
    .click();
  await expect(
    page.getByLabel("I understand and confirm this action"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep unchanged" }).click();
  await expect(
    page.getByLabel("I understand and confirm this action"),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "System overview" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
