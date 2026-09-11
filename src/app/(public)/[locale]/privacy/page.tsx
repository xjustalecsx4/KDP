import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";

const copy = {
  en: {
    title: "Privacy policy",
    description: "How The Quiet Bookshelf handles website, administrator and Pinterest data, and how to exercise your privacy rights.",
    updated: "Last updated: 12 September 2026",
    operator: "Who is responsible",
    operatorText: "This policy covers The Quiet Bookshelf website and its private book-content management application. The Quiet Bookshelf is an independent project run by an individual, not a registered company.",
    contact: "For privacy questions or requests to access or delete personal data, contact:",
    sections: [
      ["Browsing the website", "You can read our pages without creating an account. The application has no public signup, checkout, newsletter signup or visitor comment form. We do not receive your payment details when you follow a book link to Amazon. Hosting infrastructure may process your IP address, browser information, requested pages and request times to deliver and protect the website."],
      ["Cookies and local preferences", "The public website does not include advertising trackers or visitor analytics scripts. Language is selected through the page address. The private administration area uses necessary authentication cookies; connecting Pinterest also uses a temporary security cookie to verify the connection request. Blocking these cookies can prevent sign-in or account connection."],
      ["Administration and messages", "For the private administrator account, the application processes name, email address, a password hash, session information and security records. It also stores uploaded book materials, generated content and publishing records. If you email us, we process your email address and the information in your message to respond. Please do not send sensitive personal information that is unnecessary for your request."],
      ["Pinterest integration", "Connecting Pinterest is an optional action available to the administrator. After authorization, the application can receive the connected username, authorization tokens and board information. It uses these to verify the connection, list boards and publish content that the administrator approves and schedules. Publishing sends Pinterest the selected image, title, description, destination link and board identifier. Tokens are encrypted on the server and are not displayed publicly. Visitors do not need to connect a Pinterest account to read this website."],
      ["Disconnecting Pinterest and deleting data", "The administrator can disconnect Pinterest in the application's platform settings, after resolving pending publishing jobs, or revoke access in Pinterest settings. Disconnecting in the application removes stored authorization tokens; it does not automatically delete existing Pins or all publishing history. To request deletion of retained personal data, email the privacy contact above. Pins already published must also be managed on Pinterest. We may verify your identity before fulfilling a request."],
      ["Why we process data", "Where the GDPR applies, our legitimate interests in running a secure website and administering our own publishing activities support necessary technical, security and account processing. We process correspondence to respond to your request; steps you request before a contract or a legal obligation may apply where relevant. Pinterest authorization grants API permissions and can be revoked; it does not authorize unrelated uses of your data. If a future feature requires consent, we will request it separately before that processing."],
      ["Service providers and external links", "Hosting, storage and email providers process information needed to deliver their services. Pinterest receives information when the administrator connects or publishes; Amazon processes visits and purchases on its own website under its own policy. If the administrator enables an external AI writing provider, book descriptions and content instructions are sent to that provider to generate drafts. Pinterest tokens are not part of those requests. We do not sell personal data. The website cozypages.ro is hosted on a Host-Age VPS in Romania. Our public contact address uses Gmail, provided by Google. Pinterest, Google and any enabled external AI provider may process data outside the European Economic Area. Where applicable, transfers require an adequacy decision or appropriate safeguards, such as standard contractual clauses. You can contact us for information about the safeguards applicable to your data."],
      ["How long data is kept", "We retain data only as needed for its purpose, security, resolving disputes or legal obligations. Administrator sessions are configured for one day and the Pinterest connection request expires after ten minutes. Pinterest credentials remain until disconnection or removal; content and publishing history remain until managed or deleted by the administrator. Technical logs are retained according to the server’s rotation settings for security and fault diagnosis. Backup copies, where maintained, are kept only for recovery and expire under the applicable backup cycle. Contact us for details or to request deletion; an applicable legal retention duty may limit deletion."],
      ["Your rights", "Where applicable, you may request access, correction, deletion, restriction or portability of your personal data and object to processing based on legitimate interests. You may withdraw consent where consent is the basis, without affecting earlier lawful processing. We normally respond within one month; if a permitted extension is necessary, we will explain it. You can complain to your local data protection authority, including ANSPDCP in Romania. We do not use visitor data for automated decisions with legal or similarly significant effects."],
      ["Children and policy changes", "This website does not offer accounts to children or intentionally collect their personal information. If you believe a child has provided personal information, please contact us. We will update this page when our data practices change and revise the date above."],
    ],
  },
  ro: {
    title: "Politica de confidențialitate",
    description: "Cum gestionează The Quiet Bookshelf datele site-ului, administratorului și integrării Pinterest și cum îți poți exercita drepturile.",
    updated: "Ultima actualizare: 12 septembrie 2026",
    operator: "Cine este responsabil",
    operatorText: "Această politică acoperă site-ul The Quiet Bookshelf și aplicația sa privată pentru administrarea conținutului despre cărți. The Quiet Bookshelf este un proiect independent administrat de o persoană fizică, nu o societate comercială.",
    contact: "Pentru întrebări despre confidențialitate sau cereri de acces ori ștergere a datelor personale, contactează:",
    sections: [
      ["Navigarea pe site", "Poți citi paginile fără să creezi un cont. Aplicația nu are înregistrare publică, plată online, abonare la newsletter sau formular de comentarii pentru vizitatori. Nu primim datele tale de plată când urmezi un link către o carte pe Amazon. Infrastructura de găzduire poate prelucra adresa IP, informații despre browser, paginile solicitate și orele cererilor pentru a furniza și proteja site-ul."],
      ["Cookie-uri și preferințe locale", "Site-ul public nu include instrumente de urmărire publicitară sau scripturi de analiză a vizitatorilor. Limba este selectată prin adresa paginii. Zona privată de administrare utilizează cookie-uri necesare autentificării; conectarea Pinterest utilizează și un cookie temporar de securitate pentru verificarea cererii. Blocarea acestor cookie-uri poate împiedica autentificarea sau conectarea contului."],
      ["Administrare și mesaje", "Pentru contul privat de administrator, aplicația prelucrează numele, adresa de email, un hash al parolei, informații despre sesiuni și înregistrări de securitate. Stochează și materialele încărcate despre cărți, conținutul generat și istoricul publicărilor. Dacă ne scrii prin email, prelucrăm adresa ta și informațiile din mesaj pentru a răspunde. Te rugăm să nu trimiți informații personale sensibile care nu sunt necesare cererii tale."],
      ["Integrarea Pinterest", "Conectarea Pinterest este o acțiune opțională disponibilă administratorului. După autorizare, aplicația poate primi numele contului conectat, tokenuri de autorizare și informații despre panouri. Le utilizează pentru verificarea conexiunii, afișarea panourilor și publicarea conținutului aprobat și programat de administrator. Publicarea transmite către Pinterest imaginea, titlul, descrierea, linkul de destinație și identificatorul panoului selectat. Tokenurile sunt criptate pe server și nu sunt afișate public. Vizitatorii nu trebuie să conecteze un cont Pinterest pentru a citi site-ul."],
      ["Deconectarea Pinterest și ștergerea datelor", "Administratorul poate deconecta Pinterest din setările platformelor aplicației, după rezolvarea publicărilor în așteptare, sau poate revoca accesul din setările Pinterest. Deconectarea din aplicație elimină tokenurile de autorizare stocate; nu șterge automat Pinurile existente sau întregul istoric de publicare. Pentru ștergerea datelor personale păstrate, scrie la adresa de contact de mai sus. Pinurile deja publicate trebuie gestionate și în Pinterest. Putem verifica identitatea înainte de a soluționa o cerere."],
      ["De ce prelucrăm datele", "Atunci când se aplică RGPD, interesele noastre legitime de a opera un site sigur și de a administra propriile activități de publicare susțin prelucrarea necesară a datelor tehnice, de securitate și de cont. Prelucrăm corespondența pentru a răspunde cererilor; demersurile solicitate înaintea unui contract sau o obligație legală pot fi aplicabile, după caz. Autorizarea Pinterest acordă permisiuni API și poate fi revocată; nu permite utilizări fără legătură cu scopul comunicat. Dacă o funcție viitoare necesită consimțământ, îl vom solicita separat înaintea prelucrării."],
      ["Furnizori și linkuri externe", "Furnizorii de găzduire, stocare și email prelucrează informațiile necesare serviciilor lor. Pinterest primește informații când administratorul conectează contul sau publică; Amazon gestionează vizitele și cumpărăturile pe propriul site conform propriei politici. Dacă administratorul activează un furnizor extern de generare a textelor cu AI, descrierile cărților și instrucțiunile de conținut sunt trimise acestuia pentru crearea ciornelor. Tokenurile Pinterest nu fac parte din aceste cereri. Nu vindem date personale. Site-ul cozypages.ro este găzduit pe un VPS Host-Age în România. Adresa noastră publică de contact utilizează Gmail, furnizat de Google. Pinterest, Google și orice furnizor extern de AI activat pot prelucra date în afara Spațiului Economic European. Dacă sunt aplicabile, transferurile necesită o decizie de adecvare sau garanții corespunzătoare, precum clauzele contractuale standard. Ne poți contacta pentru informații despre garanțiile aplicabile datelor tale."],
      ["Cât timp păstrăm datele", "Păstrăm datele numai cât este necesar pentru scopul lor, securitate, soluționarea litigiilor sau obligații legale. Sesiunile administratorului sunt configurate pentru o zi, iar cererea de conectare Pinterest expiră după zece minute. Datele de autorizare Pinterest rămân până la deconectare sau eliminare; conținutul și istoricul publicărilor rămân până la gestionarea sau ștergerea lor de către administrator. Jurnalele tehnice sunt păstrate conform rotației configurate pe server pentru securitate și diagnosticarea erorilor. Copiile de siguranță, acolo unde sunt realizate, sunt păstrate numai pentru recuperare și expiră conform ciclului de backup aplicabil. Ne poți contacta pentru detalii sau ștergere; o obligație legală de păstrare poate limita ștergerea."],
      ["Drepturile tale", "În condițiile aplicabile, poți solicita accesul, rectificarea, ștergerea, restricționarea sau portabilitatea datelor tale și te poți opune prelucrării bazate pe interese legitime. Poți retrage consimțământul atunci când acesta este temeiul, fără a afecta prelucrarea legală anterioară. În mod normal răspundem în cel mult o lună; dacă este necesară o prelungire permisă, îți vom explica motivul. Poți depune o plângere la autoritatea de protecție a datelor competentă, inclusiv ANSPDCP în România. Nu utilizăm datele vizitatorilor pentru decizii automate cu efecte juridice sau similare semnificative."],
      ["Copiii și modificarea politicii", "Site-ul nu oferă conturi copiilor și nu colectează intenționat datele lor personale. Dacă bănuiești că un copil ne-a transmis informații personale, contactează-ne. Vom actualiza această pagină când se schimbă practicile de prelucrare și vom modifica data de mai sus."],
    ],
  },
};

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ro") notFound();
  const text = copy[locale];
  return pageMetadata(locale, "/privacy", text.title + " | The Quiet Bookshelf", text.description);
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ro") notFound();
  const text = copy[locale];
  const email = "thequietbookshelf1@gmail.com";
  return (
    <article className="store-article privacy-policy">
      <Link href={"/" + locale}>← The Quiet Bookshelf</Link>
      <h1>{text.title}</h1>
      <p>{text.updated}</p>
      <section>
        <h2>{text.operator}</h2>
        <p>{text.operatorText}</p>
        <p>{text.contact} <a href={"mailto:" + email}>{email}</a>.</p>
      </section>
      {text.sections.map(([title, body]) => (
        <section key={title}><h2>{title}</h2><p>{body}</p></section>
      ))}
      <p><a href="https://policy.pinterest.com/en/privacy-policy">Pinterest — Privacy policy</a></p>
      <p><a href="https://www.dataprotection.ro/">ANSPDCP</a></p>
    </article>
  );
}
