import { expect, test } from "@playwright/test";
import sharp from "sharp";
import path from "node:path";
test("book uploads, concepts, image/carousel/video rendering and approval", async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.TEST_RENDER_WORKFLOW !== "1" ||
      !process.env.TEST_ADMIN_EMAIL ||
      !process.env.TEST_ADMIN_PASSWORD,
    "Requires disposable application, template provider, configured renderer and running worker.",
  );
  test.setTimeout(360000);
  const testName = "Workflow verification " + Date.now();
  const ids: Record<string, string | undefined> = {};
  const fixtures = [];
  for (let i = 0; i < 4; i++) {
    const file = path.join(testInfo.outputDir, "page-" + i + ".png");
    await import("node:fs/promises").then((fs) =>
      fs.mkdir(testInfo.outputDir, { recursive: true }),
    );
    await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100"><rect width="800" height="1100" fill="#f5f1e8"/><path d="M100 500 L400 200 L700 500 V900 H100 Z" fill="none" stroke="#203c32" stroke-width="12"/><text x="120" y="1020" font-size="36">Test artwork ' +
          i +
          "</text></svg>",
      ),
    )
      .png()
      .toFile(file);
    fixtures.push(file);
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill(process.env.TEST_ADMIN_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30000 });
  await page.goto("/books/new");
  await page.getByLabel("Title", { exact: true }).fill(testName);
  await page.getByLabel("Audience", { exact: true }).fill("family");
  await page
    .getByLabel("Description", { exact: true })
    .fill(
      "A collection of hand-drawn cottage pages for relaxing creative time.",
    );
  await page
    .getByLabel("Themes (comma separated)")
    .fill("cozy cottages, coloring");
  await page
    .getByLabel("Keywords (comma separated)")
    .fill("coloring, creative");
  await page.getByRole("button", { name: "Add book", exact: true }).click();
  await expect(page).toHaveURL(/\/books\/(?!new)[^/?]+$/, { timeout: 30000 });
  ids.book = page.url().split("/").pop();
  console.log("PASS create book");
  await page.goto(`/books/${ids.book}?tab=assets`);
  await page.getByLabel("Asset type").selectOption("COVER");
  await page.locator("input[type=file]").setInputFiles(fixtures[0]);
  await expect(page.getByRole("status")).toContainText("1 asset uploaded", {
    timeout: 30000,
  });
  await page.getByLabel("Asset type").selectOption("INTERIOR_PAGE");
  await page.locator("input[type=file]").setInputFiles(fixtures.slice(1));
  await expect(page.getByRole("status")).toContainText("3 assets uploaded", {
    timeout: 30000,
  });
  console.log("PASS cover and interior uploads");
  for (const [template, key, angle] of [
    ["pinterest-preview", "image", "quiet cottage previews"],
    ["tiktok-carousel", "carousel", "four pages to explore"],
    ["cozy-reveal", "video", "a slow cottage reveal"],
  ]) {
    await page.goto(`/create?book=${ids.book}`);
    await page.getByLabel("Platform and format").selectOption(template);
    await page.getByLabel("Content angle", { exact: true }).fill(angle);
    for (const checkbox of await page.locator("input[name=assetId]").all())
      await checkbox.check();
    await page.getByRole("button", { name: "Generate draft concept" }).click();
    await expect(page).toHaveURL(/\/content\/[^/?]+$/, { timeout: 45000 });
    ids[key] = page.url().split("/").pop();
    console.log(`PASS ${key} draft generation`);
    await page
      .getByRole("button", { name: "Submit render", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Render queued", {
      timeout: 15000,
    });
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(5000);
      await page.reload();
      if (
        await page.getByRole("button", { name: "Approve", exact: true }).count()
      )
        break;
      if (await page.getByText("failed", { exact: true }).count())
        throw new Error(key + " render failed");
    }
    await expect(
      page.getByRole("button", { name: "Approve", exact: true }),
    ).toBeVisible({ timeout: 5000 });
    if (key === "video") {
      const video = page.locator("video");
      await expect(video).toBeVisible();
      await expect
        .poll(() => video.evaluate((v) => (v as HTMLVideoElement).videoWidth), {
          timeout: 20000,
        })
        .toBe(1080);
      await expect
        .poll(() => video.evaluate((v) => (v as HTMLVideoElement).videoHeight))
        .toBe(1920);
      await expect
        .poll(() => video.evaluate((v) => (v as HTMLVideoElement).duration))
        .toBe(16);
    }
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Content approved", {
      timeout: 15000,
    });
    console.log(`PASS ${key} rendering, preview, approval`);
  }
});
