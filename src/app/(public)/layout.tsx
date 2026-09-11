import { setStoreLanguage } from "@/server/bookstore-language-action";
import { getStoreLocale, localize } from "@/server/bookstore-locale";
import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { bookstore } from "@/lib/journal";
import "../bookstore.css";
export const metadata = {
  title: { default: bookstore.name, template: "%s · " + bookstore.name },
  description: bookstore.tagline,
};
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getStoreLocale();
  return localize(
    <div className="bookstore" lang={locale}>
      <a className="store-skip" href="#store-main">
        Sari la conținut
      </a>
      <div className="store-announcement">
        PENTRU PAGINI RĂSFOITE PE ÎNDELETE ȘI IDEI CARE PRIND CULOARE
      </div>
      <header className="store-header">
        <Link href="/" className="store-brand">
          <BookOpen strokeWidth={1.2} />
          <span>
            {bookstore.name}
            <small>BOOKS · CREATIVITY · SLOW LIVING</small>
          </span>
        </Link>
        <nav aria-label="Navigare librărie">
          <Link href="/#colectie">Colecția</Link>
          <Link href="/blog">Jurnal</Link>
          <Link href="/#poveste">Povestea noastră</Link>
        </nav>
        <div className="header-tools">
          <form action={setStoreLanguage}>
            <input
              type="hidden"
              name="locale"
              value={locale === "en" ? "ro" : "en"}
            />
            <button
              className="language-toggle"
              aria-label={
                locale === "en" ? "Switch to Romanian" : "Switch to English"
              }
            >
              {locale === "en" ? "EN / ro" : "en / RO"}
            </button>
          </form>
          <Link className="store-account" href="/admin">
            Spațiul meu <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main id="store-main">{children}</main>
      <footer className="store-footer">
        <div>
          <Link className="store-brand" href="/">
            <BookOpen strokeWidth={1.2} />
            {bookstore.name}
          </Link>
          <p>{bookstore.tagline}</p>
        </div>
        <div>
          <Link href="/#colectie">Colecția</Link>
          <Link href="/blog">Jurnal</Link>
          <Link href="/admin">Administrare</Link>
        </div>
        <span>Cu loc pentru încă o poveste.</span>
      </footer>
    </div>,
    locale,
  );
}
