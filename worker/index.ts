import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { db } from "../src/lib/db";
import { queueTransaction } from "../src/services/jobs";
import { getSettings } from "../src/services/settings";
import { audit, logEvent } from "../src/services/events";
import { safeErrors } from "../src/lib/policies";
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
  // Fail honestly instead of generating dummy assets. Content handlers are the next Phase 1 milestone.
  await queueTransaction(async (tx) => {
    await tx.renderJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        errorCode: "HANDLER_UNAVAILABLE",
        errorMessage: safeErrors.HANDLER_UNAVAILABLE,
        completedAt: new Date(),
        leaseExpiresAt: null,
      },
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
