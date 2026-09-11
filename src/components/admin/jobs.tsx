import Link from "next/link";
import { db } from "@/lib/db";
import { canCancelJob, canRetryJob, safeError } from "@/lib/policies";
import { SectionTitle, Status, Empty, date } from "../ui";
import { ActionForm } from "../action-form";
import { text, pageNumber, pageSize, Pagination, type Query } from "./shared";
export async function JobsSection({ query }: { query: Query }) {
  const statuses = [
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
  ] as const;
  const selected = statuses.find((s) => s === text(query, "status"));
  const page = pageNumber(query);
  const jobs = await db.renderJob.findMany({
    where: { status: selected },
    include: {
      content: { select: { title: true, book: { select: { title: true } } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    skip: (page - 1) * pageSize,
  });
  return (
    <section className="panel">
      <SectionTitle
        title="Job management"
        description="Inspect processing history and safely manage the queue."
      >
        <ActionForm
          area="jobs"
          operation="clear-failed"
          label="Clear expired failed jobs"
          danger
          confirmation="Delete failed job records older than the configured retention period? Publishing jobs, referenced jobs, and uncertain operations are excluded."
        />
      </SectionTitle>
      <form className="filters">
        <label>
          Status
          <select name="status" defaultValue={selected ?? ""}>
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="button secondary">Apply filter</button>
      </form>
      {jobs.length === 0 ? (
        <Empty
          title="No jobs found"
          description="Jobs will appear when content generation and rendering are enabled."
        />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Job / content",
                  "Status",
                  "Created",
                  "Started / completed",
                  "Attempts",
                  "Error",
                  "Actions",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, pageSize).map((j) => (
                <tr key={j.id}>
                  <td>
                    <Link className="text-link" href={`/admin/jobs/${j.id}`}>
                      {j.type.replaceAll("_", " ")}
                    </Link>
                    <small>{j.content?.book.title ?? "System job"}</small>
                    <small>{j.content?.title ?? "—"}</small>
                  </td>
                  <td>
                    <Status value={j.status} />
                    {j.requiresReconciliation && (
                      <small>Reconciliation required</small>
                    )}
                  </td>
                  <td>{date(j.createdAt)}</td>
                  <td>
                    {date(j.startedAt)}
                    <small>{date(j.completedAt)}</small>
                  </td>
                  <td>
                    {j.attemptCount} / {j.maxAttempts}
                  </td>
                  <td className="error-cell">
                    {safeError(j.errorCode) ?? "—"}
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link href={`/admin/jobs/${j.id}`}>Details</Link>
                      {j.scheduledPostId ? (
                        <Link href="/admin/scheduler">Manage schedule</Link>
                      ) : (
                        <>
                          {canRetryJob(j) && (
                            <ActionForm
                              area="jobs"
                              operation="retry"
                              id={j.id}
                              label="Retry"
                            />
                          )}
                          {canCancelJob(j) && (
                            <ActionForm
                              area="jobs"
                              operation="cancel"
                              id={j.id}
                              label="Cancel"
                              danger
                              confirmation="Cancel this pending job? It will no longer be picked up by a worker."
                            />
                          )}
                          {j.status === "COMPLETED" && (
                            <ActionForm
                              area="jobs"
                              operation="delete"
                              id={j.id}
                              label="Delete"
                              danger
                              confirmation="Delete this completed job record? Its history will be removed. Files remain subject to reference checks."
                            />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        base="/admin/jobs"
        query={query}
        page={page}
        more={jobs.length > pageSize}
      />
      <div className="panel-note">
        Processing jobs cannot be cancelled. Uncertain publishing outcomes must
        be reconciled before a retry.
      </div>
    </section>
  );
}
