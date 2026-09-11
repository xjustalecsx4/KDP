import { getStoreLocale, localize } from "@/server/bookstore-locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/lib/journal";
import { BookshelfArt } from "@/components/bookshelf-art";
export function generateStaticParams() {
  return articles.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  return {
    title: article?.title ?? "Articol negăsit",
    description: article?.excerpt,
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();
  const locale = await getStoreLocale();
  return localize(
    <article className="store-article">
      <Link className="store-text-link" href="/blog">
        ← Înapoi în jurnal
      </Link>
      <span className="store-eyebrow">{article.category}</span>
      <h1>{article.title}</h1>
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
