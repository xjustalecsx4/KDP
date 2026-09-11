import { z } from "zod";
export const settingsSchema = z
  .object({
    workerPollingSeconds: z.coerce.number().int().min(2).max(300).default(5),
    renderRetryLimit: z.coerce.number().int().min(1).max(10).default(3),
    publishRetryLimit: z.coerce.number().int().min(1).max(5).default(2),
    temporaryRetentionHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(2160)
      .default(24),
    failedJobRetentionDays: z.coerce.number().int().min(1).max(365).default(30),
    timezone: z
      .string()
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Use a valid IANA timezone")
      .default("UTC"),
    schedulingBehavior: z
      .enum(["HOLD_OVERDUE", "PUBLISH_WHEN_AVAILABLE"])
      .default("HOLD_OVERDUE"),
  })
  .strict();
export type OperationalSettings = z.infer<typeof settingsSchema>;
export const defaults = settingsSchema.parse({});
export type JobPolicy = {
  status: string;
  type: string;
  criticalOperation: boolean;
  requiresReconciliation: boolean;
  attemptCount: number;
  maxAttempts: number;
};
export function canCancelJob(job: JobPolicy) {
  return (
    job.status === "PENDING" &&
    !job.criticalOperation &&
    !job.requiresReconciliation
  );
}
export function canRetryJob(job: JobPolicy) {
  return (
    job.status === "FAILED" &&
    !job.criticalOperation &&
    !job.requiresReconciliation &&
    job.attemptCount < job.maxAttempts
  );
}
export function workerIsActive(
  lastSeen: Date | null | undefined,
  now = Date.now(),
) {
  return !!lastSeen && now - lastSeen.getTime() < 45_000;
}
export class ActionError extends Error {}
// Raw exception strings are intentionally never persisted or sent to a browser.
export const safeErrors: Record<string, string> = {
  HANDLER_UNAVAILABLE:
    "This job handler is not installed. Complete the content or platform integration before retrying.",
  WORKER_LOST: "Worker stopped before completing this job.",
  PUBLISH_UNCERTAIN:
    "Publishing outcome is uncertain. Reconcile with the platform before any retry.",
  RENDER_FAILED:
    "Rendering failed. Check renderer availability and validated input files.",
  PLATFORM_FAILED:
    "The platform request failed. Check the connection and permissions.",
};
export function safeError(code: string | null) {
  return code
    ? (safeErrors[code] ??
        "An operation failed. Sensitive technical details are withheld.")
    : null;
}
