import { test, expect } from "@playwright/test";
test("KDP description and download link persist and publish only on opt-in", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.TEST_ADMIN_EMAIL || !process.env.TEST_ADMIN_PASSWORD,
    "Requires a disposable test administrator",
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.TEST_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/books/new");
  const title = "KDP verification " + Date.now();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByRole("button", { name: "Add book", exact: true }).click();
  await expect(page).toHaveURL(/\/books\/(?!new)[^/?]+$/);
  const url = page.url();
  const guest = await browser.newContext();
  const publicPage = await guest.newPage();
  try {
    await page.getByRole("link", { name: "KDP", exact: true }).click();
    await page
      .getByLabel("KDP description", { exact: true })
      .fill("A downloadable manuscript and instructions.");
    await page
      .getByLabel("Download URL", { exact: true })
      .fill("https://example.com/kdp-verification.pdf");
    await page.getByRole("button", { name: "Save KDP details" }).click();
    await expect(page.getByRole("status")).toContainText("KDP details saved");
    await page.reload();
    await expect(
      page.getByLabel("KDP description", { exact: true }),
    ).toHaveValue("A downloadable manuscript and instructions.");
    await publicPage.goto("/ro#kdp");
    await expect(
      publicPage.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
    await page.getByLabel("Publish on the public website").check();
    await page.getByRole("button", { name: "Save KDP details" }).click();
    await expect(page.getByRole("status")).toContainText("KDP details saved");
    await publicPage.reload();
    const resource = publicPage.locator("article").filter({
      has: publicPage.getByRole("heading", { name: title, exact: true }),
    });
    await expect(resource).toContainText(
      "A downloadable manuscript and instructions.",
    );
    await expect(resource.getByRole("link")).toHaveAttribute(
      "href",
      "https://example.com/kdp-verification.pdf",
    );
    await page.reload();
    await page.getByLabel("Publish on the public website").uncheck();
    await page.getByRole("button", { name: "Save KDP details" }).click();
    await expect(page.getByRole("status")).toContainText("KDP details saved");
    await publicPage.reload();
    await expect(
      publicPage.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(0);
  } finally {
    await guest.close();
    await page.goto(url);
    await page
      .getByRole("button", { name: "Delete book", exact: true })
      .click();
    await page.getByLabel("I understand and confirm this action").check();
    await page
      .getByRole("button", { name: "Delete book", exact: true })
      .click();
    await expect(page).toHaveURL(/\/books$/);
  }
});
