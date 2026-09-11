import { describe, expect, it } from "vitest";
import {
  canCancelJob,
  canRetryJob,
  settingsSchema,
  workerIsActive,
  safeError,
  type JobPolicy,
} from "../src/lib/policies";
const job: JobPolicy = {
  type: "PUBLISH",
  status: "PENDING",
  criticalOperation: false,
  requiresReconciliation: false,
  attemptCount: 0,
  maxAttempts: 3,
};
describe("job safety", () => {
  it("allows cancellation only before processing", () => {
    expect(canCancelJob(job)).toBe(true);
    for (const status of ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
      expect(canCancelJob({ ...job, status })).toBe(false);
  });
  it("rejects cancellation during a critical operation or reconciliation", () => {
    expect(canCancelJob({ ...job, criticalOperation: true })).toBe(false);
    expect(canCancelJob({ ...job, requiresReconciliation: true })).toBe(false);
  });
  it("never replays uncertain publishing or exhausted attempts", () => {
    const failed = { ...job, status: "FAILED", attemptCount: 1 };
    expect(canRetryJob(failed)).toBe(true);
    expect(canRetryJob({ ...failed, requiresReconciliation: true })).toBe(
      false,
    );
    expect(canRetryJob({ ...failed, criticalOperation: true })).toBe(false);
    expect(canRetryJob({ ...failed, attemptCount: 3 })).toBe(false);
    expect(canRetryJob({ ...failed, status: "PROCESSING" })).toBe(false);
  });
});
describe("operational settings", () => {
  it("defaults to holding overdue content", () => {
    expect(settingsSchema.parse({}).schedulingBehavior).toBe("HOLD_OVERDUE");
  });
  it.each([
    { workerPollingSeconds: 0 },
    { renderRetryLimit: 50 },
    { publishRetryLimit: 6 },
    { temporaryRetentionHours: -1 },
    { failedJobRetentionDays: 0 },
    { timezone: "Invalid/Zone" },
    { schedulingBehavior: "AUTOPILOT" },
    { injectedSecret: "not allowed" },
  ])("rejects unsafe settings %j", (input) => {
    expect(settingsSchema.safeParse(input).success).toBe(false);
  });
  it("accepts an IANA timezone and safe numeric strings from forms", () => {
    expect(
      settingsSchema.parse({
        timezone: "Europe/Bucharest",
        workerPollingSeconds: "15",
      }).workerPollingSeconds,
    ).toBe(15);
  });
});
describe("health and error disclosure", () => {
  it("reports missing and stale heartbeats offline", () => {
    expect(workerIsActive(null)).toBe(false);
    expect(workerIsActive(new Date(0), 45000)).toBe(false);
    expect(workerIsActive(new Date(0), 44999)).toBe(true);
  });
  it("does not display arbitrary error messages", () => {
    expect(safeError("Authorization: Bearer private-value")).not.toContain(
      "private-value",
    );
  });
});
