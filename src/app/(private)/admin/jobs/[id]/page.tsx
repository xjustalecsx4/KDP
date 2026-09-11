import Link from "next/link";
import { requireAdmin } from "@/server/authorization";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { safeError, canRetryJob, canCancelJob } from "@/lib/policies";
import { ActionForm } from "@/components/action-form";
import { date, Status, SectionTitle } from "@/components/ui";
export default async function JobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const job = await db.renderJob.findUnique({
    where: { id },
    include: {
      content: { select: { title: true, book: { select: { title: true } } } },
    },
  });
  if (!job) notFound();
  return (
    <section className="panel">
      <SectionTitle title="Job details">
        <Link href="/admin/jobs">← All jobs</Link>
      </SectionTitle>
      <Status value={job.status} />
      <dl className="key-values">
        {[
          ["ID", job.id],
          ["Type", job.type],
          ["Book", job.content?.book.title ?? "—"],
          ["Content", job.content?.title ?? "—"],
          ["Created", date(job.createdAt)],
          ["Started", date(job.startedAt)],
          ["Completed", date(job.completedAt)],
          ["Attempts", `${job.attemptCount} / ${job.maxAttempts}`],
          [
            "Critical publishing operation",
            job.criticalOperation ? "Yes — locked" : "No",
          ],
          [
            "Reconciliation required",
            job.requiresReconciliation ? "Yes" : "No",
          ],
          ["Error", safeError(job.errorCode) ?? "None recorded"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="button-row">
        {job.scheduledPostId ? (
          <Link href="/admin/scheduler">Manage in Scheduler</Link>
        ) : (
          <>
            {canRetryJob(job) && (
              <ActionForm
                area="jobs"
                operation="retry"
                id={id}
                label="Retry job"
              />
            )}
            {canCancelJob(job) && (
              <ActionForm
                area="jobs"
                operation="cancel"
                id={id}
                label="Cancel job"
                danger
                confirmation="Cancel this pending job?"
              />
            )}
            {job.status === "COMPLETED" && (
              <ActionForm
                area="jobs"
                operation="delete"
                id={id}
                label="Delete completed job"
                danger
                confirmation="Permanently delete this completed job record?"
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}
