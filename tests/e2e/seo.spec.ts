import { test, expect } from "@playwright/test";
test("crawlable bilingual pages, canonical metadata, structured data and private exclusions", async ({
  page,
  request,
}) => {
  const legacy = await request.get("/blog/un-colt-doar-pentru-citit", {
    maxRedirects: 0,
  });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe("/en/blog/cozy-reading-corner");
  await page.goto("/en/blog/cozy-reading-corner");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(
    "How to create a cozy reading corner at home | The Quiet Bookshelf",
  );
  await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
    "href",
    /\/en\/blog\/cozy-reading-corner$/,
  );
  await expect(page.locator("link[hreflang=ro]")).toHaveAttribute(
    "href",
    /\/ro\/blog\/un-colt-doar-pentru-citit$/,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "en_US",
  );
  const json = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const graphs = json.flatMap((s) => JSON.parse(s)["@graph"]);
  expect(
    graphs.some((g) => g["@type"] === "BlogPosting" && g.inLanguage === "en"),
  ).toBe(true);
  expect(
    graphs.some(
      (g) => g["@type"] === "BreadcrumbList" && g.itemListElement.length === 3,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Switch to Romanian" }).click();
  await expect(page).toHaveURL(/\/ro\/blog\/un-colt-doar-pentru-citit$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await expect(page).toHaveTitle(
    "Cum amenajezi un colț de lectură acasă | The Quiet Bookshelf",
  );
  await page
    .context()
    .addCookies([
      { name: "bookstore-language", value: "ro", url: "http://localhost:3000" },
    ]);
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A little less noise.",
  );
  expect((await request.get("/robots.txt")).status()).toBe(200);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "<loc>",
  );
  const privatePage = await request.get("/admin", { maxRedirects: 0 });
  expect(privatePage.headers()["x-robots-tag"]).toContain("noindex");
  expect((await request.get("/en/blog/missing")).status()).toBe(404);
  expect((await request.get("/fr")).status()).toBe(404);
  expect(
    (await request.get("/brand/social-preview.png")).headers()["content-type"],
  ).toContain("image/png");
});
