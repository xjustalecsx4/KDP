import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { Empty } from "@/components/ui";
export default async function Books() {
  await requireAdmin();
  const books = await db.book.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { assets: true, content: true } },
      assets: {
        where: { type: "COVER" },
        take: 1,
        include: { files: { where: { role: "THUMBNAIL" }, take: 1 } },
      },
    },
  });
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CATALOG</div>
          <h1>Books</h1>
          <p>
            Every story starts with a book. Keep your catalog and creative
            material together.
          </p>
        </div>
        <Link className="button" href="/books/new">
          Add book
        </Link>
      </div>
      {!books.length ? (
        <section className="panel">
          <Empty
            title="Add your first KDP book"
            description="Add its details, cover and interior pages to start creating content."
          />
          <Link className="button" href="/books/new">
            Add your first book
          </Link>
        </section>
      ) : (
        <div className="book-grid">
          {books.map((book) => {
            const file = book.assets[0]?.files[0];
            return (
              <Link
                className="book-card"
                key={book.id}
                href={`/books/${book.id}`}
              >
                <div className="book-cover">
                  {file ? (
                    <Image
                      src={`/api/files/${file.fileId}`}
                      alt={`${book.title} cover`}
                      width={240}
                      height={320}
                      unoptimized
                    />
                  ) : (
                    <span>No cover uploaded</span>
                  )}
                </div>
                <h2>{book.title}</h2>
                <p>
                  {book.audience} · {book.asin || "No ASIN"}
                </p>
                <small>
                  {book._count.assets} assets · {book._count.content} posts
                </small>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
