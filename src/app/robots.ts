import type { MetadataRoute } from "next";
import { indexingEnabled, publicOrigin } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return indexingEnabled()
    ? {
        rules: {
          userAgent: "*",
          allow: ["/en", "/ro", "/_next/", "/brand/"],
          disallow: [
            "/admin",
            "/dashboard",
            "/books",
            "/create",
            "/content",
            "/calendar",
            "/templates",
            "/analytics",
            "/settings",
            "/login",
            "/forbidden",
            "/api/",
          ],
        },
        sitemap: publicOrigin() + "/sitemap.xml",
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
