import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { db } from "../src/lib/db";
import { queueTransaction } from "../src/services/jobs";
import { getSettings } from "../src/services/settings";
import { audit, logEvent } from "../src/services/events";
import { safeErrors } from "../src/lib/policies";
import { renderJobInput } from "../src/services/rendering";
const id = randomUUID();
let stopping = false;
let inHeartbeat = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});
async function heartbeat() {
  if (inHeartbeat) return;
  inHeartbeat = true;
  try {
    await db.workerHeartbeat.upsert({
      where: { id },
      create: {
        id,
        schedulerEnabled: false,
        version: process.env.APP_VERSION ?? "0.1.0",
      },
      update: { lastSeenAt: new Date(), schedulerEnabled: false },
    });
    await db.renderJob.updateMany({
      where: { workerId: id, status: "PROCESSING" },
      data: { leaseExpiresAt: new Date(Date.now() + 60_000) },
    });
  } finally {
    inHeartbeat = false;
  }
}
async function recover() {
  await queueTransaction(async (tx) => {
    const stale = await tx.renderJob.findMany({
      where: { status: "PROCESSING", leaseExpiresAt: { lt: new Date() } },
      take: 100,
    });
    for (const job of stale) {
      const uncertain = job.type === "PUBLISH" || job.criticalOperation;
      const code = uncertain ? "PUBLISH_UNCERTAIN" : "WORKER_LOST";
      await tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          requiresReconciliation: uncertain,
          criticalOperation: false,
          errorCode: code,
          errorMessage: safeErrors[code],
          leaseExpiresAt: null,
        },
      });
      if (job.scheduledPostId)
        await tx.scheduledPost.update({
          where: { id: job.scheduledPostId },
          data: { status: "FAILED" },
        });
      if (job.contentId && !uncertain)
        await tx.contentItem.update({
          where: { id: job.contentId },
          data: { status: "FAILED" },
        });
    }
    if (stale.length)
      await audit(tx, "WORKER_RECOVERY", {
        source: "worker",
        level: "WARNING",
      });
  });
}
async function processOne() {
  const job = await queueTransaction(async (tx) => {
    // Publishing and analytics are not claimed until their official providers exist.
    const jobs = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "RenderJob" WHERE status = 'PENDING' AND type IN ('IMAGE_RENDER','VIDEO_RENDER') AND "availableAt" <= NOW() AND "attemptCount" < "maxAttempts" AND NOT "requiresReconciliation" AND NOT "criticalOperation" ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!jobs.length) return null;
    const next = await tx.renderJob.update({
      where: { id: jobs[0].id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        workerId: id,
        leaseExpiresAt: new Date(Date.now() + 60_000),
        attemptCount: { increment: 1 },
      },
    });
    await audit(tx, "JOB_STARTED", { source: "worker", jobId: next.id });
    return next;
  });
  if (!job) return;
  try {
    if (!job.contentId) throw new Error("Missing content");
    const outputs = await renderJobInput(job.input);
    await queueTransaction(async (tx) => {
      const current = await tx.renderJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      if (current.status !== "PROCESSING" || current.workerId !== id)
        throw new Error("Job ownership lost");
      await tx.fileReference.deleteMany({
        where: { contentId: job.contentId!, role: "OUTPUT" },
      });
      for (const [position, output] of outputs.entries())
        await tx.storedFile.create({
          data: {
            key: output.key,
            category: output.category,
            bytes: output.data.length,
            mimeType: output.mimeType,
            references: {
              create: [
                { contentId: job.contentId!, role: "OUTPUT", position },
                { jobId: job.id, role: "OUTPUT", position },
              ],
            },
          },
        });
      await tx.contentItem.update({
        where: { id: job.contentId! },
        data: { status: "READY_FOR_REVIEW" },
      });
      await tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          leaseExpiresAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      await tx.workerHeartbeat.update({
        where: { id },
        data: { lastActivityAt: new Date(), lastSeenAt: new Date() },
      });
      await audit(tx, "JOB_COMPLETED", { source: "worker", jobId: job.id });
    });
  } catch {
    await queueTransaction(async (tx) => {
      const current = await tx.renderJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      if (current.status !== "PROCESSING" || current.workerId !== id) return;
      const retry = current.attemptCount < current.maxAttempts;
      await tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: retry ? "PENDING" : "FAILED",
          errorCode: "RENDER_FAILED",
          errorMessage: safeErrors.RENDER_FAILED,
          availableAt: new Date(
            Date.now() + Math.min(300, 10 * 2 ** current.attemptCount) * 1000,
          ),
          completedAt: retry ? null : new Date(),
          leaseExpiresAt: null,
        },
      });
      if (job.contentId)
        await tx.contentItem.update({
          where: { id: job.contentId },
          data: { status: retry ? "DRAFT" : "FAILED" },
        });
      await tx.workerHeartbeat.update({
        where: { id },
        data: { lastActivityAt: new Date(), lastSeenAt: new Date() },
      });
      await audit(tx, "JOB_FAILED", {
        source: "worker",
        level: "ERROR",
        jobId: job.id,
      });
    });
  }
}
async function main() {
  await heartbeat();
  await logEvent("WORKER_STARTED", { source: "worker" });
  const timer = setInterval(() => {
    void heartbeat().catch(() => {
      console.error("Worker heartbeat failed; database unavailable.");
    });
  }, 10_000);
  try {
    while (!stopping) {
      const settings = await getSettings();
      await recover();
      await processOne();
      // Short sleep slices let SIGTERM stop promptly even with a long configured poll interval.
      for (
        let elapsed = 0;
        elapsed < settings.workerPollingSeconds && !stopping;
        elapsed++
      )
        await sleep(1000);
    }
  } finally {
    clearInterval(timer);
    await db.workerHeartbeat.update({
      where: { id },
      data: { lastSeenAt: new Date(0), schedulerEnabled: false },
    });
    await logEvent("WORKER_STOPPED", { source: "worker" });
    await db.$disconnect();
  }
}
main().catch(async () => {
  console.error(
    "Worker stopped: verify database connection, migrations, and configuration.",
  );
  await db.$disconnect();
  process.exitCode = 1;
});
