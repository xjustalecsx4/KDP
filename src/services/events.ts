import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
// Only fixed messages from this catalog can be recorded; no exception text or user input.
export const events = {
  PUBLISH_RECONCILED: "Published Pin verified and reconciled",
  PLATFORM_CONNECTED: "Platform connected through OAuth",
  PLATFORM_TESTED: "Platform connection tested and boards synchronized",
  SCHEDULE_CREATED: "Approved content scheduled for publishing",
  FAILED_JOBS_CLEARED: "Expired failed job records cleared",
  JOB_RETRIED: "Job returned to the queue",
  JOB_CANCELLED: "Pending job cancelled",
  JOB_DELETED: "Completed job deleted",
  SCHEDULE_RETRIED: "Failed scheduled post returned to the queue",
  SCHEDULE_CANCELLED: "Scheduled publishing cancelled",
  SCHEDULE_MOVED: "Scheduled publishing rescheduled",
  PLATFORM_DISCONNECTED: "Platform credentials removed",
  SETTINGS_SAVED: "Operational settings updated",
  STORAGE_CLEANED: "Unreferenced storage files cleaned",
  WORKER_STARTED: "Worker started",
  WORKER_STOPPED: "Worker stopped",
  JOB_STARTED: "Job started",
  JOB_FAILED: "Job failed",
  JOB_COMPLETED: "Job completed",
  WORKER_RECOVERY: "Expired worker leases recovered",
  AUTH_FAILURE: "Authentication request failed",
  AUTH_CHANGED: "Account security updated",
} as const;
export function audit(
  tx: Pick<Prisma.TransactionClient, "systemEvent">,
  event: keyof typeof events,
  context: {
    actorId?: string;
    jobId?: string;
    platform?: "PINTEREST" | "TIKTOK";
    source?: string;
    level?: "INFO" | "WARNING" | "ERROR";
  } = {},
) {
  return tx.systemEvent.create({
    data: {
      message: events[event],
      level: context.level ?? "INFO",
      source: context.source ?? "admin",
      actorId: context.actorId,
      jobId: context.jobId,
      platform: context.platform,
    },
  });
}
export const logEvent = (
  event: keyof typeof events,
  context?: Parameters<typeof audit>[2],
) => audit(db, event, context);
export function safeEventMessage(message: string) {
  return (Object.values(events) as string[]).includes(message) ||
    message === "Administrator session created"
    ? message
    : "Event recorded. Unstructured details withheld.";
}
export function safeEventSource(source: string) {
  return ["admin", "worker", "auth", "app", "scheduler", "platform"].includes(
    source,
  )
    ? source
    : "system";
}
