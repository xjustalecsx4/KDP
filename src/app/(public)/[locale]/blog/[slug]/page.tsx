import { articleRoutes, findArticleKey, storePath } from "@/lib/public-routes";
import { articleTitle, pageMetadata, publicOrigin } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { getStoreLocale, localize, translate } from "@/server/bookstore-locale";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { articles } from "@/lib/journal";
import { BookshelfArt } from "@/components/bookshelf-art";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getStoreLocale();
  const key = findArticleKey(slug);
  const article = articles.find((a) => a.slug === key);
  if (!key || !article)
    return {
      title: "Article not found",
      robots: { index: false, follow: false },
    };
  return pageMetadata(
    locale,
    "/blog/" + key,
    articleTitle(key, locale) + " | The Quiet Bookshelf",
    translate(article.excerpt, locale),
    true,
  );
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const key = findArticleKey(slug);
  const article = articles.find((a) => a.slug === key);
  if (!article || !key) notFound();
  const locale = await getStoreLocale();
  if (slug !== articleRoutes[key][locale])
    permanentRedirect(storePath("/blog/" + key, locale));
  const title = articleTitle(key, locale);
  const url = publicOrigin() + storePath("/blog/" + key, locale);
  const crumbs = [
    { name: "The Quiet Bookshelf", item: publicOrigin() + "/" + locale },
    {
      name: locale === "ro" ? "Jurnal" : "Journal",
      item: publicOrigin() + "/" + locale + "/blog",
    },
    { name: title, item: url },
  ];
  return localize(
    <article className="store-article">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              "@id": url + "#article",
              headline: title,
              description: translate(article.excerpt, locale),
              inLanguage: locale,
              mainEntityOfPage: url,
              url,
              author: {
                "@type": "Organization",
                name: "The Quiet Bookshelf",
                url: publicOrigin() + "/" + locale,
              },
              publisher: { "@id": publicOrigin() + "/#publisher" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: crumbs.map((c, index) => ({
                "@type": "ListItem",
                position: index + 1,
                ...c,
              })),
            },
          ],
        }}
      />
      <nav
        className="article-breadcrumbs"
        aria-label={locale === "ro" ? "Fir de navigare" : "Breadcrumb"}
      >
        {crumbs.map((c, index) => (
          <span key={c.item}>
            {index > 0 && " / "}
            {index === 2 ? (
              <span aria-current="page">{c.name}</span>
            ) : (
              <Link href={c.item}>{c.name}</Link>
            )}
          </span>
        ))}
      </nav>
      <Link className="store-text-link" href="/blog">
        ← Înapoi în jurnal
      </Link>
      <span className="store-eyebrow">{article.category}</span>
      <h1>{title}</h1>
      <p className="article-byline">
        {locale === "ro"
          ? "Din jurnalul The Quiet Bookshelf"
          : "From The Quiet Bookshelf journal"}
      </p>
      <p className="article-lead">{article.excerpt}</p>
      <BookshelfArt theme={article.theme} />
      <div className="article-body">
        {article.sections.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            <p>{s.text}</p>
          </section>
        ))}
      </div>
      <aside className="article-related">
        <span className="store-eyebrow">MAI RĂSFOIEȘTE PUȚIN</span>
        {articles
          .filter((a) => a.slug !== slug)
          .map((a) => (
            <Link href={"/blog/" + a.slug} key={a.slug}>
              {a.title} ↗
            </Link>
          ))}
      </aside>
    </article>,
    locale,
  );
}
