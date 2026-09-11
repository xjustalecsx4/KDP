import { afterEach, describe, it, expect, vi } from "vitest";
import {
  storePath,
  isPublicPage,
  findArticleKey,
} from "../src/lib/public-routes";
import { pageMetadata, indexingEnabled, safeJsonLd } from "../src/lib/seo";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
afterEach(() => vi.unstubAllEnvs());
describe("public SEO routing and launch controls", () => {
  it("maps both languages and preserves anchors without touching private routes", () => {
    expect(storePath("/#colectie", "ro")).toBe("/ro#colectie");
    expect(storePath("/ro/blog/un-colt-doar-pentru-citit", "en")).toBe(
      "/en/blog/cozy-reading-corner",
    );
    expect(storePath("/en/blog/cozy-reading-corner", "ro")).toBe(
      "/ro/blog/un-colt-doar-pentru-citit",
    );
    expect(storePath("/admin", "ro")).toBe("/admin");
    expect(storePath("/privacy", "en")).toBe("/en/privacy");
    expect(storePath("/en/privacy", "ro")).toBe("/ro/privacy");
    expect(isPublicPage("/ro/privacy")).toBe(true);
    expect(isPublicPage("/en/privacy/private")).toBe(false);
    expect(findArticleKey("unknown")).toBeUndefined();
    expect(isPublicPage("/en/admin")).toBe(false);
  });
  it("keeps previews and localhost unindexable even with a launch flag", () => {
    vi.stubEnv("SEO_INDEXING_ENABLED", "true");
    vi.stubEnv("SITE_URL", "http://localhost:3000");
    expect(indexingEnabled()).toBe(false);
    expect(sitemap()).toEqual([]);
    expect(robots().rules).toMatchObject({ disallow: "/" });
    vi.stubEnv("SITE_URL", "https://preview.local");
    expect(indexingEnabled()).toBe(false);
  });
  it("generates public canonical URLs and reciprocal alternates when launched", () => {
    vi.stubEnv("SEO_INDEXING_ENABLED", "true");
    vi.stubEnv("SITE_URL", "https://books.example.org");
    vi.stubEnv("APP_URL", "https://books.example.org");
    expect(indexingEnabled()).toBe(true);
    const entries = sitemap();
    expect(entries).toHaveLength(12);
    expect(new Set(entries.map((x) => x.url)).size).toBe(12);
    expect(
      entries.every(
        (x) => !x.url.includes("/admin") && !x.url.includes("/api/"),
      ),
    ).toBe(true);
    expect(
      entries.every((x) => Object.keys(x.alternates!.languages!).length === 2),
    ).toBe(true);
    const meta = pageMetadata(
      "ro",
      "/blog/un-colt-doar-pentru-citit",
      "Titlu",
      "Descriere",
      true,
    );
    expect(meta.alternates?.canonical).toBe(
      "https://books.example.org/ro/blog/un-colt-doar-pentru-citit",
    );
    expect(meta.alternates?.languages?.en).toBe(
      "https://books.example.org/en/blog/cozy-reading-corner",
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(robots().sitemap).toBe("https://books.example.org/sitemap.xml");
  });
  it("refuses launch with missing confirmation or mismatched app origin", () => {
    vi.stubEnv("SITE_URL", "https://books.example.org");
    vi.stubEnv("APP_URL", "https://staging.example.org");
    vi.stubEnv("SEO_INDEXING_ENABLED", "true");
    expect(indexingEnabled()).toBe(false);
    vi.stubEnv("APP_URL", "https://books.example.org");
    vi.stubEnv("SEO_INDEXING_ENABLED", "false");
    expect(indexingEnabled()).toBe(false);
  });
  it("escapes script-breaking characters in JSON-LD", () => {
    const value = { text: "</script><script>alert(1)</script>" };
    const serialized = safeJsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
