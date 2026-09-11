import { PublicKdp } from "@/components/public-kdp";
import { homeCopy, pageMetadata } from "@/lib/seo";
import { getStoreLocale, localize } from "@/server/bookstore-locale";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Download,
  Layers3,
  Leaf,
  Pencil,
  Sparkles,
} from "lucide-react";
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
            STUDIO DE CĂRȚI, PRINTABLES ȘI RESURSE KDP
          </span>
          <h1>
            Cărți liniștite.
            <br />
            Idei gata de <em>publicat.</em>
          </h1>
          <p>
            Un spațiu creativ pentru caiete, pagini de colorat, jurnale și
            resurse descărcabile construite pentru autori, cititori și proiecte
            KDP.
          </p>
          <div className="store-actions">
            <Link className="store-button" href="#kdp">
              Vezi resursele KDP <ArrowRight size={17} />
            </Link>
            <Link className="store-text-link" href="/blog">
              Răsfoiește jurnalul ↗
            </Link>
          </div>
          <span className="hero-footnote">
            Pentru proiecte mici care pot deveni rafturi întregi.
          </span>
        </div>
        <div className="hero-illustration">
          <BookshelfArt />
          <span className="art-caption">
            UN RAFT LINIȘTIT · MULTE FORMATE CREATIVE
          </span>
        </div>
      </section>
      <div className="store-values">
        <span>
          <BookOpen /> Cărți și caiete
        </span>
        <span>
          <Pencil /> Pagini de colorat
        </span>
        <span>
          <Leaf /> Resurse KDP publicabile
        </span>
      </div>
      <section className="store-section studio-panel" id="studio">
        <div className="store-section-heading">
          <div>
            <span className="store-eyebrow">CE CREȘTE PE RAFT</span>
            <h2>Un studio pentru produse digitale cu suflet.</h2>
          </div>
          <span className="store-tag">Potrivit pentru KDP</span>
        </div>
        <div className="studio-grid">
          <article>
            <Sparkles />
            <span>01</span>
            <h3>Concepte de carte</h3>
            <p>
              Idei pentru jurnale, caiete de activități, cărți de colorat și
              resurse creative care pot porni dintr-o singură temă.
            </p>
          </article>
          <article>
            <Layers3 />
            <span>02</span>
            <h3>Pagini și pachete</h3>
            <p>
              Secțiuni organizate pentru descrieri, preview-uri și linkuri de
              descărcare, publicate doar când alegi tu.
            </p>
          </article>
          <article>
            <Download />
            <span>03</span>
            <h3>Descărcări KDP</h3>
            <p>
              Freebies, bonusuri și fișiere utile pentru cititori sau pentru
              promovarea titlurilor create în workspace.
            </p>
          </article>
          <article>
            <CalendarDays />
            <span>04</span>
            <h3>Promovare calmă</h3>
            <p>
              Un loc pregătit pentru articole, resurse și campanii Pinterest,
              fără să amestecăm partea publică cu administrarea privată.
            </p>
          </article>
        </div>
      </section>
      <section className="store-section" id="colectie">
        <div className="store-section-heading">
          <div>
            <span className="store-eyebrow">COLECȚIA ÎN LUCRU</span>
            <h2>Rafturi gândite pentru citit, scris și creat.</h2>
          </div>
          <span className="store-tag">Colecție în pregătire</span>
        </div>
        <div className="collection-intro">
          <div className="collection-number">01 — 03</div>
          <div>
            <h3>De la o idee mică la un produs publicabil.</h3>
            <p>
              Aici vor apărea cărți de colorat, caiete creative, jurnale și
              resurse bonus. Fiecare titlu poate avea propria descriere KDP și
              propriul link de descărcare.
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
          <span className="store-eyebrow">FILOZOFIA ACESTUI STUDIO</span>
          <h2>
            Unele produse merită
            <br />
            construite <em>pe îndelete.</em>
          </h2>
          <p>
            O copertă clară. O descriere bună. O pagină bonus care chiar ajută.
            Site-ul public rămâne cald și simplu, iar workspace-ul se ocupă de
            partea grea: conținut, coadă de lucru, fișiere și publicare.
          </p>
        </div>
        <span className="story-margin">
          FROM IDEA
          <br />
          TO SHELF
        </span>
      </section>
      <section className="store-section">
        <div className="store-section-heading">
          <div>
            <span className="store-eyebrow">JURNALUL STUDIOULUI</span>
            <h2>Idei pentru pagini, rafturi și lansări.</h2>
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
