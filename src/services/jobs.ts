import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { ActionError, canCancelJob, canRetryJob } from "@/lib/policies";
import { audit } from "./events";
import { getSettings } from "./settings";

export async function clearExpiredFailedJobs(actorId: string) {
  const settings = await getSettings();
  const cutoff = new Date(
    Date.now() - settings.failedJobRetentionDays * 86400000,
  );
  return queueTransaction(async (tx) => {
    const result = await tx.renderJob.deleteMany({
      where: {
        status: "FAILED",
        completedAt: { lt: cutoff },
        scheduledPostId: null,
        type: { not: "PUBLISH" },
        criticalOperation: false,
        requiresReconciliation: false,
        files: { none: {} },
      },
    });
    await audit(tx, "FAILED_JOBS_CLEARED", { actorId });
    return result.count;
  });
}

// All queue/schedule mutations, including worker claims, take this short transaction lock.
export async function queueTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7312401)`;
      return fn(tx);
    },
    { timeout: 10_000 },
  );
}
export async function mutateJob(
  id: string,
  action: "retry" | "cancel" | "delete",
  actorId: string,
) {
  return queueTransaction(async (tx) => {
    const job = await tx.renderJob.findUnique({ where: { id } });
    if (!job) throw new ActionError("Job no longer exists. Refresh the list.");
    if (job.scheduledPostId)
      throw new ActionError(
        "Manage this publishing job through Scheduler to keep its schedule consistent.",
      );
    if (action === "retry") {
      if (!canRetryJob(job))
        throw new ActionError(
          "Retry is unavailable: check the job status, retry limit, and reconciliation requirement.",
        );
      await tx.renderJob.update({
        where: { id },
        data: {
          status: "PENDING",
          availableAt: new Date(),
          startedAt: null,
          completedAt: null,
          workerId: null,
          leaseExpiresAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      await audit(tx, "JOB_RETRIED", { actorId, jobId: id });
    } else if (action === "cancel") {
      if (!canCancelJob(job))
        throw new ActionError(
          "Only pending jobs can be safely cancelled. Processing jobs must finish.",
        );
      await tx.renderJob.update({
        where: { id },
        data: { status: "CANCELLED", completedAt: new Date() },
      });
      await audit(tx, "JOB_CANCELLED", { actorId, jobId: id });
    } else {
      if (
        job.status !== "COMPLETED" ||
        job.criticalOperation ||
        job.requiresReconciliation
      )
        throw new ActionError("Only completed jobs can be deleted.");
      await tx.renderJob.delete({ where: { id } });
      await audit(tx, "JOB_DELETED", { actorId, jobId: id });
    }
  });
}
export async function mutateSchedule(
  id: string,
  action: "retry" | "cancel" | "reschedule",
  actorId: string,
  when?: Date,
  timezone?: string,
) {
  const settings = await getSettings();
  return queueTransaction(async (tx) => {
    const post = await tx.scheduledPost.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!post) throw new ActionError("Scheduled post no longer exists.");
    if (
      !["SCHEDULED", "FAILED"].includes(post.status) ||
      (post.job && !["PENDING", "FAILED"].includes(post.job.status)) ||
      post.job?.criticalOperation ||
      post.job?.requiresReconciliation
    ) {
      throw new ActionError(
        "This post cannot be changed while publishing, after publication, or while its outcome is uncertain.",
      );
    }
    if (action === "cancel") {
      await tx.scheduledPost.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      if (post.job)
        await tx.renderJob.update({
          where: { id: post.job.id },
          data: { status: "CANCELLED", completedAt: new Date() },
        });
      await audit(tx, "SCHEDULE_CANCELLED", {
        actorId,
        platform: post.platform,
      });
      return;
    }
    if (
      action === "retry" &&
      (post.status !== "FAILED" || (post.job && !canRetryJob(post.job)))
    )
      throw new ActionError("This scheduled post is not eligible for retry.");
    if (
      action === "reschedule" &&
      (!when || when.getTime() < Date.now() + 60_000)
    )
      throw new ActionError("Choose a time at least one minute in the future.");
    // Moving a schedule must not bypass exhausted or uncertain publishing attempts.
    if (
      post.job
        ? post.job.attemptCount >= post.job.maxAttempts
        : post.attemptCount >= settings.publishRetryLimit
    )
      throw new ActionError("The publishing retry limit has been reached.");
    const scheduledAt = action === "retry" ? new Date() : when!;
    await tx.scheduledPost.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt,
        ...(timezone ? { timezone } : {}),
      },
    });
    if (post.job)
      await tx.renderJob.update({
        where: { id: post.job.id },
        data: {
          status: "PENDING",
          availableAt: scheduledAt,
          startedAt: null,
          completedAt: null,
          errorCode: null,
          errorMessage: null,
          workerId: null,
          leaseExpiresAt: null,
        },
      });
    await audit(
      tx,
      action === "retry" ? "SCHEDULE_RETRIED" : "SCHEDULE_MOVED",
      { actorId, platform: post.platform },
    );
  });
}
