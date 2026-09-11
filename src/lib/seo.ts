import type { Metadata } from "next";
import {
  articleRoutes,
  storePath,
  type ArticleKey,
  type StoreLanguage,
} from "./public-routes";
export function publicOrigin() {
  try {
    const url = new URL(
      process.env.SITE_URL ?? process.env.APP_URL ?? "http://localhost:3000",
    );
    return url.origin;
  } catch {
    return "http://localhost:3000";
  }
}
export function indexingEnabled() {
  if (process.env.SEO_INDEXING_ENABLED !== "true" || !process.env.SITE_URL)
    return false;
  try {
    const url = new URL(process.env.SITE_URL);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !/^(localhost|127\.|0\.|\[|.*\.(local|test|invalid|example)$)/i.test(
        url.hostname,
      ) &&
      url.hostname.includes(".") &&
      url.origin === new URL(process.env.APP_URL ?? "").origin
    );
  } catch {
    return false;
  }
}
export const homeCopy = {
  en: {
    title: "Books, coloring & creative inspiration | The Quiet Bookshelf",
    description:
      "Find inspiration for reading, coloring and creative journaling. Explore The Quiet Bookshelf journal and discover a book collection in the making.",
  },
  ro: {
    title: "Cărți, colorat și inspirație creativă | The Quiet Bookshelf",
    description:
      "Idei pentru lectură, colorat și un jurnal creativ. Explorează articolele The Quiet Bookshelf și descoperă o colecție de cărți în pregătire.",
  },
};
export const blogCopy = {
  en: {
    title: "Reading, coloring & journaling ideas | The Quiet Bookshelf",
    description:
      "Practical ideas for a cozy reading corner, your first coloring page and a creative notebook. Read the bilingual Quiet Bookshelf journal.",
  },
  ro: {
    title: "Idei de lectură, colorat și jurnal | The Quiet Bookshelf",
    description:
      "Idei practice pentru un colț de lectură, prima pagină de colorat și un carnet creativ. Citește jurnalul bilingv The Quiet Bookshelf.",
  },
};
export function pageMetadata(
  language: StoreLanguage,
  path: string,
  title: string,
  description: string,
  article = false,
): Metadata {
  const base = publicOrigin();
  const url = base + storePath(path, language);
  const image = {
    url: base + "/brand/social-preview.png",
    width: 1200,
    height: 630,
    alt: "The Quiet Bookshelf — books and creative inspiration",
  };
  return {
    title: { absolute: title },
    description,
    metadataBase: new URL(base),
    alternates: {
      canonical: url,
      languages: {
        en: base + storePath(path, "en"),
        ro: base + storePath(path, "ro"),
        "x-default": base + storePath(path, "en"),
      },
    },
    robots: { index: indexingEnabled(), follow: indexingEnabled() },
    openGraph: {
      type: article ? "article" : "website",
      url,
      title,
      description,
      siteName: "The Quiet Bookshelf",
      locale: language === "ro" ? "ro_RO" : "en_US",
      alternateLocale: language === "ro" ? ["en_US"] : ["ro_RO"],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}
export function articleTitle(key: ArticleKey, language: StoreLanguage) {
  return articleRoutes[key].titles[language];
}
export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
