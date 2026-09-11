import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { Empty, Status } from "@/components/ui";
export default async function ContentQueue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const q = await searchParams;
  const statuses = [
    "DRAFT",
    "READY_FOR_REVIEW",
    "APPROVED",
    "REJECTED",
    "SCHEDULED",
    "PUBLISHING",
    "PUBLISHED",
    "FAILED",
  ];
  const page = Math.max(1, Number.parseInt(q.page ?? "1") || 1);
  const day =
    q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date)
      ? new Date(`${q.date}T00:00:00Z`)
      : null;
  const [books, items] = await Promise.all([
    db.book.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    db.contentItem.findMany({
      where: {
        bookId: q.book || undefined,
        platform:
          q.platform === "PINTEREST" || q.platform === "TIKTOK"
            ? q.platform
            : undefined,
        status: statuses.includes(q.status ?? "") ? q.status : undefined,
        format: ["IMAGE", "CAROUSEL", "VIDEO"].includes(q.format ?? "")
          ? q.format
          : undefined,
        ...(day && !isNaN(day.getTime())
          ? { createdAt: { gte: day, lt: new Date(day.getTime() + 86400000) } }
          : {}),
      },
      include: {
        book: { select: { title: true } },
        files: {
          where: { role: "OUTPUT", file: { category: "IMAGE" } },
          take: 1,
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 24,
      take: 25,
    }),
  ]);
  const nextUrl = (p: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(q))
      if (typeof value === "string") params.set(key, value);
    params.set("page", String(p));
    return `/content?${params}`;
  };
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">REVIEW BEFORE YOU SHARE</div>
          <h1>Content queue</h1>
          <p>
            Draft, render, preview, and approve. Publishing stays under your
            control.
          </p>
        </div>
        <Link className="button" href="/create">
          Create content
        </Link>
      </div>
      <section className="panel">
        <form className="filters">
          <label>
            Book
            <select name="book" defaultValue={q.book ?? ""}>
              <option value="">All books</option>
              {books.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select name="platform" defaultValue={q.platform ?? ""}>
              <option value="">All platforms</option>
              <option>PINTEREST</option>
              <option>TIKTOK</option>
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={q.status ?? ""}>
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            Format
            <select name="format" defaultValue={q.format ?? ""}>
              <option value="">All formats</option>
              <option>IMAGE</option>
              <option>CAROUSEL</option>
              <option>VIDEO</option>
            </select>
          </label>
          <label>
            Created date (UTC)
            <input type="date" name="date" defaultValue={q.date} />
          </label>
          <button className="button secondary">Filter</button>
          <Link href="/content">Reset</Link>
        </form>
        {!items.length ? (
          <Empty
            title="No content found"
            description="Generate your first campaign or adjust the filters."
          />
        ) : (
          <div className="content-grid">
            {items.slice(0, 24).map((item) => (
              <Link
                className="content-card"
                href={`/content/${item.id}`}
                key={item.id}
              >
                <div className="content-thumb">
                  {item.files[0] ? (
                    <Image
                      src={`/api/files/${item.files[0].fileId}`}
                      alt={item.title}
                      width={240}
                      height={320}
                      unoptimized
                    />
                  ) : (
                    <span>
                      {item.format === "VIDEO"
                        ? "Video creative"
                        : "Creative preview"}
                    </span>
                  )}
                </div>
                <Status value={item.status} />
                <h3>{item.title}</h3>
                <p>{item.book.title}</p>
                <small>
                  {item.platform} · {item.format}
                  {item.jobs[0] &&
                  ["PENDING", "PROCESSING"].includes(item.jobs[0].status)
                    ? ` · ${item.jobs[0].status === "PENDING" ? "Render queued" : "Rendering"}`
                    : ""}
                </small>
              </Link>
            ))}
          </div>
        )}
        <div className="pagination">
          {page > 1 && <Link href={nextUrl(page - 1)}>← Previous</Link>}
          <span>Page {page}</span>
          {items.length > 24 && <Link href={nextUrl(page + 1)}>Next →</Link>}
        </div>
      </section>
    </div>
  );
}
