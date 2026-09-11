import { publicKdpResources } from "@/services/kdp";
export async function PublicKdp({ locale }: { locale: "en" | "ro" }) {
  const books = await publicKdpResources();
  const ro = locale === "ro";
  return (
    <section className="store-section" id="kdp">
      <div className="store-section-heading">
        <div>
          <span className="store-eyebrow">
            {ro ? "RAFTUL DE DESCĂRCĂRI" : "DOWNLOAD SHELF"}
          </span>
          <h2>{ro ? "Resurse KDP publicate." : "Published KDP resources."}</h2>
        </div>
        <span className="store-tag">
          {ro ? "vizibile doar după publicare" : "shown only after publishing"}
        </span>
      </div>
      <p className="kdp-intro">
        {ro
          ? "Aici apar descrierile și linkurile de descărcare pe care le publici din workspace. Este vitrina pentru bonusuri, mostre, caiete sau materiale care susțin cărțile tale."
          : "This shelf shows the descriptions and download links you publish from the workspace. Use it for bonuses, samples, notebooks, and supporting material for your books."}
      </p>
      {books.length ? (
        <div className="kdp-resource-grid">
          {books.map((book, index) => (
            <article className="kdp-resource" key={index}>
              <span className="kdp-resource-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{book.title}</h3>
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {book.kdpDescription}
              </p>
              <a
                className="store-button"
                href={book.kdpDownloadUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {ro ? "Deschide linkul de descărcare" : "Open download link"} ↗
              </a>
              <small>
                {ro
                  ? "Se deschide pe site-ul unde este găzduit fișierul."
                  : "Opens the website hosting the file."}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <p>
          {ro
            ? "Resursele KDP vor apărea aici după publicare."
            : "KDP resources will appear here once published."}
        </p>
      )}
    </section>
  );
}
