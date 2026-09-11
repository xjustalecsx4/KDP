import { publicKdpResources } from "@/services/kdp";
export async function PublicKdp({ locale }: { locale: "en" | "ro" }) {
  const books = await publicKdpResources();
  const ro = locale === "ro";
  return (
    <section className="store-section" id="kdp">
      <div className="store-section-heading">
        <div>
          <span className="store-eyebrow">
            {ro ? "RESURSE DE DESCĂRCAT" : "DOWNLOADABLE RESOURCES"}
          </span>
          <h2>KDP</h2>
        </div>
      </div>
      {books.length ? (
        <div className="kdp-resource-grid">
          {books.map((book, index) => (
            <article className="kdp-resource" key={index}>
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
