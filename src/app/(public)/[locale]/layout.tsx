import { StructuredData } from "@/components/structured-data";
import { publicOrigin } from "@/lib/seo";
import { LanguageSwitch } from "@/components/language-switch";
import { notFound } from "next/navigation";
import { getStoreLocale, localize } from "@/server/bookstore-locale";
import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { bookstore } from "@/lib/journal";
import "../../bookstore.css";
export const metadata = {
  title: { default: bookstore.name, template: "%s · " + bookstore.name },
  description: bookstore.tagline,
};
export default async function PublicLayout({
  children,
  params,
}: {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
}) {
  const route = await params;
  if (!["en", "ro"].includes(route.locale)) notFound();
  const locale = await getStoreLocale();
  return localize(
    <div className="bookstore" lang={locale}>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": publicOrigin() + "/#website",
              url: publicOrigin() + "/en",
              name: bookstore.name,
              inLanguage: ["en", "ro"],
            },
            {
              "@type": "Organization",
              "@id": publicOrigin() + "/#publisher",
              name: bookstore.name,
              url: publicOrigin() + "/en",
              logo: publicOrigin() + "/brand/quiet-bookshelf-icon.png",
            },
          ],
        }}
      />
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
          <LanguageSwitch />
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
