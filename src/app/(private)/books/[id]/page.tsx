import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { BookForm } from "@/components/book-form";
import { AssetUploader } from "@/components/asset-uploader";
import { ContentForm } from "@/components/content-form";
import { Empty, SectionTitle, Status } from "@/components/ui";
export default async function BookDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const book = await db.book.findUnique({
    where: { id },
    include: {
      assets: {
        orderBy: { createdAt: "asc" },
        include: { files: { where: { role: "THUMBNAIL" }, take: 1 } },
      },
      content: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!book) notFound();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">BOOK WORKSPACE</div>
          <h1>{book.title}</h1>
          <p>
            {book.audience} · {book.assets.length} assets ·{" "}
            {book.content.length} recent posts
          </p>
        </div>
        <Link className="button" href={`/create?book=${id}`}>
          Generate content
        </Link>
      </div>
      <nav className="tabs">
        {["overview", "assets", "kdp", "content", "analytics"].map((t) => (
          <Link
            className={tab === t ? "selected" : ""}
            href={`/books/${id}?tab=${t}`}
            key={t}
          >
            {t === "kdp" ? "KDP" : t.charAt(0).toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </nav>
      {tab === "kdp" ? (
        <section className="panel" style={{ maxWidth: 850 }}>
          <SectionTitle
            title="KDP"
            description="Save a description and a download link for this book. The download is hosted at the URL you provide."
          />
          <ContentForm operation="save-kdp" id={id} label="Save KDP details">
            <label>
              KDP description
              <textarea
                name="kdpDescription"
                aria-label="KDP description"
                rows={8}
                maxLength={10000}
                defaultValue={book.kdpDescription}
                placeholder="Describe the book, manuscript or downloadable resource."
              />
            </label>
            <label>
              Download URL
              <input
                type="url"
                name="kdpDownloadUrl"
                maxLength={2048}
                defaultValue={book.kdpDownloadUrl}
                placeholder="https://…"
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="kdpPublic"
                value="yes"
                defaultChecked={book.kdpPublic}
              />{" "}
              Publish on the public website
            </label>
            <p>
              When checked, the book title, KDP description and download URL
              become visible to visitors. Uncheck and save to make them private
              again.
            </p>
          </ContentForm>
          {book.kdpDescription && (
            <div
              style={{
                marginTop: 24,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {book.kdpDescription}
            </div>
          )}
          {book.kdpDownloadUrl && (
            <a
              className="button secondary"
              style={{ marginTop: 16 }}
              href={book.kdpDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open download link ↗
            </a>
          )}
        </section>
      ) : tab === "assets" ? (
        <>
          <section className="panel">
            <SectionTitle
              title="Book assets"
              description="Upload a cover first, then the interior pages you want to feature."
            />
            <AssetUploader bookId={id} />
          </section>
          <div className="asset-grid">
            {book.assets.map((asset) => (
              <section className="panel asset-card" key={asset.id}>
                {asset.files[0] && (
                  <Image
                    src={`/api/files/${asset.files[0].fileId}`}
                    alt={asset.name}
                    width={240}
                    height={320}
                    unoptimized
                  />
                )}
                <h3>{asset.name}</h3>
                <small>{asset.type.replaceAll("_", " ")}</small>
                <ContentForm
                  operation="delete-asset"
                  id={asset.id}
                  label="Remove"
                  confirmation="Remove this asset from the book? Referenced originals remain protected."
                />
              </section>
            ))}
          </div>
        </>
      ) : tab === "content" ? (
        <section className="panel">
          {book.content.length ? (
            book.content.map((item) => (
              <Link
                className="event-row"
                key={item.id}
                href={`/content/${item.id}`}
              >
                <Status value={item.status} />
                <span>{item.title}</span>
                <span>{item.platform}</span>
              </Link>
            ))
          ) : (
            <Empty
              title="No content yet"
              description="Generate your first creative concept from this book."
            />
          )}
        </section>
      ) : tab === "analytics" ? (
        <section className="panel">
          <Empty
            title="No analytics yet"
            description="Platform analytics are a later phase. No metrics are estimated."
          />
        </section>
      ) : (
        <section className="panel" style={{ maxWidth: 850 }}>
          <BookForm book={book} />
          <hr />
          <ContentForm
            operation="delete-book"
            id={id}
            label="Delete book"
            confirmation="Delete this book and its asset records? Delete any existing content first. Original files will remain in private storage for manual review."
          />
        </section>
      )}
    </div>
  );
}
