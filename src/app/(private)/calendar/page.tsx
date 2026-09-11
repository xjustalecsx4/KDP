import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { Status } from "@/components/ui";
export default async function Calendar({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const { month } = await searchParams;
  const parsed =
    month && /^\d{4}-\d{2}$/.test(month)
      ? new Date(`${month}-01T00:00:00Z`)
      : new Date();
  const now = isNaN(parsed.getTime()) ? new Date() : parsed;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  const posts = await db.scheduledPost.findMany({
    where: { scheduledAt: { gte: start, lt: end } },
    include: {
      content: { select: { title: true, book: { select: { title: true } } } },
    },
  });
  const leading = (start.getUTCDay() + 6) % 7;
  const count = Math.round((end.getTime() - start.getTime()) / 86400000);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PLANNING</div>
          <h1>Calendar</h1>
          <p>
            Recorded schedules by month, shown in UTC. Publishing remains
            disabled in Phase 1.
          </p>
        </div>
      </div>
      <section className="panel">
        <form className="filters">
          <label>
            Month
            <input
              type="month"
              name="month"
              defaultValue={start.toISOString().slice(0, 7)}
            />
          </label>
          <button className="button secondary">View month</button>
        </form>
        <div className="calendar-grid">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <strong key={day}>{day}</strong>
          ))}
          {Array.from({ length: leading }, (_, i) => (
            <div className="calendar-cell muted" key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => (
            <div className="calendar-cell" key={i}>
              <span>{i + 1}</span>
              {posts
                .filter((p) => p.scheduledAt.getUTCDate() === i + 1)
                .map((post) => (
                  <Link href="/admin/scheduler" key={post.id}>
                    <small>{post.platform}</small>
                    {post.content.title}
                    <Status value={post.status} />
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
