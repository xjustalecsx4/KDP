import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { Empty, SectionTitle, Status, date } from "@/components/ui";
export async function DashboardContent() {
  await requireAdmin();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const [books, review, scheduled, failed, recent, published] =
    await Promise.all([
      db.book.count(),
      db.contentItem.count({ where: { status: "READY_FOR_REVIEW" } }),
      db.scheduledPost.count({
        where: {
          scheduledAt: { gte: start, lt: new Date(start.getTime() + 86400000) },
          status: "SCHEDULED",
        },
      }),
      db.renderJob.count({ where: { status: "FAILED" } }),
      db.renderJob.findMany({
        where: { type: { in: ["IMAGE_RENDER", "VIDEO_RENDER"] } },
        include: { content: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.contentItem.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CREATIVE WORKSPACE</div>
          <h1>Dashboard</h1>
          <p>Turn your book material into content worth sharing.</p>
        </div>
        <Link className="button" href="/create">
          Create content
        </Link>
      </div>
      <div className="metric-grid">
        {[
          ["Books", books, "/books"],
          ["Waiting for review", review, "/content?status=READY_FOR_REVIEW"],
          ["Scheduled today (UTC)", scheduled, "/calendar"],
          ["Failed jobs", failed, "/admin/jobs?status=FAILED"],
        ].map(([label, value, href]) => (
          <Link className="metric-card" key={String(label)} href={String(href)}>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
          </Link>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <SectionTitle title="Recent renders">
            <Link className="text-link" href="/content">
              Open content queue →
            </Link>
          </SectionTitle>
          {recent.length ? (
            recent.map((job) => (
              <Link
                href={
                  job.contentId
                    ? `/content/${job.contentId}`
                    : `/admin/jobs/${job.id}`
                }
                className="event-row"
                key={job.id}
              >
                <Status value={job.status} />
                <span>
                  {job.content?.title ?? "Render job"}
                  <small>{job.type}</small>
                </span>
                <time>{date(job.createdAt)}</time>
              </Link>
            ))
          ) : (
            <Empty
              title="Create your first campaign"
              description="Add a book, upload some pages, and generate a creative concept."
            />
          )}
        </section>
        <section className="panel">
          <SectionTitle title="Recent published content" />
          {published.length ? (
            published.map((item) => (
              <Link
                href={`/content/${item.id}`}
                className="event-row"
                key={item.id}
              >
                <Status value={item.status} />
                {item.title}
              </Link>
            ))
          ) : (
            <Empty
              title="No published posts yet"
              description="Official platform publishing is a later phase. You can export approved creatives for manual upload."
            />
          )}
        </section>
      </div>
      <section className="panel">
        <SectionTitle title="Performance insights" />
        <Empty
          title="Analytics will appear after publishing"
          description="No performance recommendations are made without sufficient real platform data."
        />
      </section>
    </div>
  );
}
