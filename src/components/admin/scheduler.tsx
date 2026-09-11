import Link from "next/link";
import { db } from "@/lib/db";
import { canRetryJob, workerIsActive } from "@/lib/policies";
import { SectionTitle, Status, Empty, Badge, date } from "../ui";
import { ActionForm } from "../action-form";
import { text, pageNumber, pageSize, Pagination, type Query } from "./shared";
export async function SchedulerSection({ query }: { query: Query }) {
  const now = new Date();
  const view = ["upcoming", "overdue", "failed", "recent"].includes(
    text(query, "view"),
  )
    ? text(query, "view")
    : "upcoming";
  const page = pageNumber(query);
  const [worker, posts, attempts] = await Promise.all([
    db.workerHeartbeat.findFirst({ orderBy: { lastSeenAt: "desc" } }),
    db.scheduledPost.findMany({
      where:
        view === "failed"
          ? { status: "FAILED" }
          : view === "recent"
            ? { status: { in: ["PUBLISHING", "PUBLISHED", "CANCELLED"] } }
            : {
                status: "SCHEDULED",
                scheduledAt: view === "overdue" ? { lt: now } : { gte: now },
              },
      include: {
        content: { select: { title: true, book: { select: { title: true } } } },
        job: true,
      },
      orderBy: { scheduledAt: view === "recent" ? "desc" : "asc" },
      take: pageSize + 1,
      skip: (page - 1) * pageSize,
    }),
    db.publishAttempt.findMany({
      include: {
        post: {
          select: { platform: true, content: { select: { title: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);
  return (
    <>
      <section className="panel">
        <SectionTitle
          title="Scheduler management"
          description="Review upcoming, overdue, and failed publishing."
        >
          <Badge
            tone={
              workerIsActive(worker?.lastSeenAt) && worker?.schedulerEnabled
                ? "good"
                : "warning"
            }
          >
            Scheduler{" "}
            {workerIsActive(worker?.lastSeenAt) && worker?.schedulerEnabled
              ? "active"
              : "inactive"}
          </Badge>
        </SectionTitle>
        <div className="notice">
          <strong>Publishing is not enabled</strong>
          <p>
            The worker records its heartbeat, but official platform publishing
            remains a later phase. Schedules are retained.
          </p>
        </div>
        <nav className="filter-tabs">
          {["upcoming", "overdue", "failed", "recent"].map((v) => (
            <Link
              className={view === v ? "selected" : ""}
              href={`/admin/scheduler?view=${v}`}
              key={v}
            >
              {v}
            </Link>
          ))}
        </nav>
        {posts.length === 0 ? (
          <Empty
            title={`No ${view} posts`}
            description="Scheduled posts and publishing history will appear here when available."
          />
        ) : (
          <div className="schedule-list">
            {posts.slice(0, pageSize).map((post) => {
              const mutable =
                ["SCHEDULED", "FAILED"].includes(post.status) &&
                (!post.job ||
                  ["PENDING", "FAILED"].includes(post.job.status)) &&
                !post.job?.criticalOperation &&
                !post.job?.requiresReconciliation;
              return (
                <article className="schedule-card" key={post.id}>
                  <div>
                    <Badge>{post.platform}</Badge>
                    <h3>{post.content.title}</h3>
                    <p>{post.content.book.title}</p>
                    <p>
                      {date(post.scheduledAt)} · Timezone: {post.timezone}
                    </p>
                    <Status value={post.status} />
                  </div>
                  {mutable && (
                    <div className="schedule-actions">
                      {post.status === "FAILED" &&
                        (!post.job || canRetryJob(post.job)) && (
                          <ActionForm
                            area="scheduler"
                            operation="retry"
                            id={post.id}
                            label="Retry"
                          />
                        )}
                      <ActionForm
                        area="scheduler"
                        operation="reschedule"
                        id={post.id}
                        label="Reschedule"
                      >
                        <label>
                          New time (ISO 8601, including timezone offset)
                          <input
                            name="scheduledAt"
                            placeholder="2026-09-20T18:00:00+03:00"
                            required
                          />
                        </label>
                      </ActionForm>
                      <ActionForm
                        area="scheduler"
                        operation="cancel"
                        id={post.id}
                        label="Cancel schedule"
                        danger
                        confirmation="Cancel this scheduled publication? It will no longer be eligible for publishing."
                      />
                    </div>
                  )}
                  {post.job?.requiresReconciliation && (
                    <p className="feedback error">
                      Reconcile the publishing outcome before making changes.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
        <Pagination
          base="/admin/scheduler"
          query={query}
          page={page}
          more={posts.length > pageSize}
        />
      </section>
      <section className="panel">
        <SectionTitle
          title="Recent publishing activity"
          description="The ten most recent recorded API publishing attempts."
        />
        {attempts.length === 0 ? (
          <Empty
            title="No publishing attempts"
            description="No publishing activity has been recorded."
          />
        ) : (
          attempts.map((a) => (
            <div className="event-row" key={a.id}>
              <Status value={a.status} />
              <span>
                {a.post.platform} · {a.post.content.title}
              </span>
              <time>{date(a.createdAt)}</time>
            </div>
          ))
        )}
      </section>
    </>
  );
}
