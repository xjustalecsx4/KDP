import { PublicKdp } from "@/components/public-kdp";
import { homeCopy, pageMetadata } from "@/lib/seo";
import { getStoreLocale, localize } from "@/server/bookstore-locale";
import Link from "next/link";
import { ArrowRight, BookOpen, Pencil, Leaf } from "lucide-react";
import { BookshelfArt } from "@/components/bookshelf-art";
import { articles } from "@/lib/journal";
export async function generateMetadata() {
  const locale = await getStoreLocale();
  return pageMetadata(
    locale,
    "/",
    homeCopy[locale].title,
    homeCopy[locale].description,
  );
}
export default async function Home() {
  const locale = await getStoreLocale();
  return localize(
    <>
      <section className="store-hero">
        <div className="hero-copy">
          <span className="store-eyebrow">
            BINE AI VENIT ÎN COLȚUL NOSTRU DE LUME
          </span>
          <h1>
            Mai puțin zgomot.
            <br />
            Mai multe <em>pagini.</em>
          </h1>
          <p>
            Cărți de răsfoit, pagini de colorat și loc pentru ideile tale. Un
            mic refugiu pentru curiozitate și bucuria de a crea.
          </p>
          <div className="store-actions">
            <Link className="store-button" href="#colectie">
              Descoperă colecția <ArrowRight size={17} />
            </Link>
            <Link className="store-text-link" href="/blog">
              Răsfoiește jurnalul ↗
            </Link>
          </div>
          <span className="hero-footnote">
            Fă-ți un ceai. Rămâi cât îți place.
          </span>
        </div>
        <div className="hero-illustration">
          <BookshelfArt />
          <span className="art-caption">
            A LITTLE SPACE FOR BIG IMAGINATIONS
          </span>
        </div>
      </section>
      <div className="store-values">
        <span>
          <BookOpen /> Povești de descoperit
        </span>
        <span>
          <Pencil /> Spațiu pentru creativitate
        </span>
        <span>
          <Leaf /> Bucuria lucrurilor simple
        </span>
      </div>
      <section className="store-section" id="colectie">
        <div className="store-section-heading">
          <div>
            <span className="store-eyebrow">PE RAFTURILE NOASTRE</span>
            <h2>Următoarea ta mică bucurie.</h2>
          </div>
          <span className="store-tag">Colecție în pregătire</span>
        </div>
        <div className="collection-intro">
          <div className="collection-number">01 — 03</div>
          <div>
            <h3>Un raft nou începe cu grijă.</h3>
            <p>
              Pregătim aici o selecție de cărți și pagini creative. Revino
              pentru titluri, coperți și detalii despre fiecare carte.
            </p>
            <Link className="store-text-link" href="/blog">
              Până atunci, intră în jurnal <ArrowRight size={16} />
            </Link>
          </div>
          <div className="collection-spines" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>
      <PublicKdp locale={locale} />
      <section className="store-story" id="poveste">
        <span className="story-symbol" aria-hidden="true">
          ✳
        </span>
        <div>
          <span className="store-eyebrow">FILOZOFIA ACESTUI MIC COLȚ</span>
          <h2>
            Unele lucruri merită
            <br />
            făcute <em>pe îndelete.</em>
          </h2>
          <p>
            O pagină citită dimineața. Un creion ales după culoare. O idee
            notată înainte să se piardă. Acesta este locul pe care îl imaginăm:
            o librărie pentru toate aceste mici momente.
          </p>
        </div>
        <span className="story-margin">
          LESS SCROLLING
          <br />
          MORE WANDERING
        </span>
      </section>
      <section className="store-section">
        <div className="store-section-heading">
          <div>
            <span className="store-eyebrow">JURNALUL LIBRĂRIEI</span>
            <h2>De citit cu o ceașcă alături.</h2>
          </div>
          <Link className="store-text-link" href="/blog">
            Toate articolele <ArrowRight size={16} />
          </Link>
        </div>
        <div className="journal-grid">
          {articles.map((a) => (
            <Link
              className="journal-card"
              href={"/blog/" + a.slug}
              key={a.slug}
            >
              <BookshelfArt theme={a.theme} />
              <span className="store-eyebrow">{a.category}</span>
              <h3>{a.title}</h3>
              <p>{a.excerpt}</p>
              <span className="store-text-link">
                Citește povestea <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="store-closing">
        <span>Un semn de carte pentru mai târziu.</span>
        <p>
          Salvează acest colț și revino când ai nevoie de puțină inspirație.
        </p>
        <BookOpen strokeWidth={1} />
      </section>
    </>,
    locale,
  );
}
