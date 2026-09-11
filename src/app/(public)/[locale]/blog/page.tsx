import { blogCopy, pageMetadata } from "@/lib/seo";
import { getStoreLocale, localize } from "@/server/bookstore-locale";
import Link from "next/link";
import { articles } from "@/lib/journal";
import { BookshelfArt } from "@/components/bookshelf-art";
export async function generateMetadata() {
  const locale = await getStoreLocale();
  return pageMetadata(
    locale,
    "/blog",
    blogCopy[locale].title,
    blogCopy[locale].description,
  );
}
export default async function Blog() {
  const locale = await getStoreLocale();
  return localize(
    <section className="store-section blog-list">
      <span className="store-eyebrow">NOTE DE PE MARGINEA PAGINII</span>
      <h1>
        Jurnalul <em>librăriei.</em>
      </h1>
      <p className="blog-intro">
        Despre lectură, pauze creative și lucrurile mici cărora le facem loc în
        fiecare zi.
      </p>
      <div className="journal-grid">
        {articles.map((a) => (
          <Link href={"/blog/" + a.slug} className="journal-card" key={a.slug}>
            <BookshelfArt theme={a.theme} />
            <span className="store-eyebrow">{a.category}</span>
            <h2>{a.title}</h2>
            <p>{a.excerpt}</p>
            <span className="store-text-link">Citește articolul →</span>
          </Link>
        ))}
      </div>
    </section>,
    locale,
  );
}
