import { expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { safeEventMessage } from "../src/services/events";
it("displays only catalog events, withholding arbitrary secret-bearing text", () => {
  expect(safeEventMessage("Job started")).toBe("Job started");
  for (const value of [
    "Authorization: Bearer secret",
    "password=hunter2",
    "API_KEY=secret",
    "postgresql://user:password@host",
    "token: secret",
  ])
    expect(safeEventMessage(value)).toBe(
      "Event recorded. Unstructured details withheld.",
    );
});
