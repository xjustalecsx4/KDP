export const languages = ["en", "ro"] as const;
export type StoreLanguage = (typeof languages)[number];
export const articleRoutes = {
  "un-colt-doar-pentru-citit": {
    en: "cozy-reading-corner",
    ro: "un-colt-doar-pentru-citit",
    titles: {
      en: "How to create a cozy reading corner at home",
      ro: "Cum amenajezi un colț de lectură acasă",
    },
  },
  "prima-pagina-de-colorat": {
    en: "coloring-for-beginners",
    ro: "prima-pagina-de-colorat",
    titles: {
      en: "Coloring for beginners: choosing your first page and colors",
      ro: "Colorat pentru începători: prima pagină și primele culori",
    },
  },
  "carnet-pentru-idei": {
    en: "creative-notebook-ideas",
    ro: "carnet-pentru-idei",
    titles: {
      en: "Creative notebook ideas: a place for everyday inspiration",
      ro: "Idei pentru un carnet creativ: inspirație de zi cu zi",
    },
  },
} as const;
export type ArticleKey = keyof typeof articleRoutes;
export function findArticleKey(slug: string): ArticleKey | undefined {
  return (Object.keys(articleRoutes) as ArticleKey[]).find(
    (key) =>
      key === slug ||
      articleRoutes[key].en === slug ||
      articleRoutes[key].ro === slug,
  );
}
export function storePath(path: string, language: string) {
  const lang = language === "ro" ? "ro" : "en";
  const normalized = path.replace(/^\/(en|ro)(?=\/|#|$)/, "") || "/";
  const [pathname, hash] = normalized.split("#");
  let target = pathname;
  if (pathname.startsWith("/blog/")) {
    const key = findArticleKey(pathname.slice(6));
    if (key) target = "/blog/" + articleRoutes[key][lang];
  }
  if (
    target === "/" ||
    target === "" ||
    target === "/blog" ||
    target.startsWith("/blog/")
  )
    return (
      "/" + lang + (target === "/" ? "" : target) + (hash ? "#" + hash : "")
    );
  return path;
}
export function isPublicPage(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (!languages.includes(parts[0] as StoreLanguage)) return false;
  if (parts.length === 1) return true;
  if (parts[1] !== "blog") return false;
  return (
    parts.length === 2 || (parts.length === 3 && !!findArticleKey(parts[2]))
  );
}
