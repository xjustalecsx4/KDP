import type { MetadataRoute } from "next";
import { indexingEnabled, publicOrigin } from "@/lib/seo";
import { articleRoutes, languages, storePath } from "@/lib/public-routes";
export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingEnabled()) return [];
  const paths = [
    "/",
    "/blog",
    ...Object.keys(articleRoutes).map((key) => "/blog/" + key),
  ];
  return paths.flatMap((path) =>
    languages.map((lang) => ({
      url: publicOrigin() + storePath(path, lang),
      alternates: {
        languages: Object.fromEntries(
          languages.map((l) => [l, publicOrigin() + storePath(path, l)]),
        ),
      },
    })),
  );
}
