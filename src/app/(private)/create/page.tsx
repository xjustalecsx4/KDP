import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { ContentForm } from "@/components/content-form";
import { Empty } from "@/components/ui";
import { templateCatalog } from "@/templates/catalog";
export default async function CreateContent({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  await requireAdmin();
  const { book: selected } = await searchParams;
  const books = await db.book.findMany({ orderBy: { title: "asc" } });
  const book = books.find((b) => b.id === selected) ?? books[0];
  const assets = book
    ? await db.bookAsset.findMany({
        where: { bookId: book.id },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        include: { files: { where: { role: "THUMBNAIL" }, take: 1 } },
      })
    : [];
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CREATE SOMETHING WORTH SHARING</div>
          <h1>Create content</h1>
          <p>
            Start with your book, choose a format, and shape a concept before
            rendering.
          </p>
        </div>
      </div>
      {!book ? (
        <section className="panel">
          <Empty
            title="Add a book first"
            description="Your catalog and uploaded pages are the source material for every creative."
          />
          <Link className="button" href="/books/new">
            Add a book
          </Link>
        </section>
      ) : (
        <>
          <section className="panel">
            <form className="filters">
              <label>
                Book
                <select name="book" defaultValue={book.id}>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary">Select book</button>
            </form>
            <div className="notice">
              <strong>
                {process.env.AI_PROVIDER === "template"
                  ? "Offline template mode"
                  : process.env.AI_PROVIDER === "openai-compatible"
                    ? "Configured AI provider"
                    : "Generator not configured"}
              </strong>
              <p>
                {process.env.AI_PROVIDER === "template"
                  ? "Concepts use your book metadata and editable writing templates. No AI request is made."
                  : "All generated content remains a draft and requires your review."}
              </p>
            </div>
            <ContentForm
              operation="generate"
              id={book.id}
              label="Generate draft concept"
            >
              <label>
                Platform and format
                <select name="template">
                  {templateCatalog.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.platform === "PINTEREST" ? "Pinterest" : "TikTok"} ·{" "}
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Content angle
                <input
                  name="angle"
                  placeholder={
                    book.contentAngles[0] ||
                    "A cozy page preview, a question, a seasonal idea…"
                  }
                  maxLength={200}
                />
              </label>
              <div>
                <h3>Select book assets</h3>
                <p>
                  Select a cover first for a video reveal, then 2–6 pages.
                  Carousels need 4–7 images.
                </p>
                <div className="asset-selector">
                  {assets.map((asset) => (
                    <label className="asset-option" key={asset.id}>
                      <input type="checkbox" name="assetId" value={asset.id} />
                      {asset.files[0] && (
                        <Image
                          src={`/api/files/${asset.files[0].fileId}`}
                          alt={asset.name}
                          width={160}
                          height={200}
                          unoptimized
                        />
                      )}
                      <span>{asset.name}</span>
                      <small>{asset.type.replaceAll("_", " ")}</small>
                    </label>
                  ))}
                </div>
                {!assets.length && (
                  <Link
                    className="text-link"
                    href={`/books/${book.id}?tab=assets`}
                  >
                    Upload book assets first →
                  </Link>
                )}
              </div>
              <label className="check">
                <input type="checkbox" name="allowSimilar" value="yes" />
                Allow a similar hook after reviewing the duplicate warning.
                Exact duplicates remain blocked.
              </label>
            </ContentForm>
          </section>
        </>
      )}
    </div>
  );
}
