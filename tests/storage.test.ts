import path from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { resolveStorageKey } from "../src/services/storage";
describe("storage key validation", () => {
  const root = path.resolve("storage");
  it("resolves a valid managed file", () => {
    expect(resolveStorageKey(root, "generated/abcd.png")).toBe(
      path.join(root, "generated", "abcd.png"),
    );
  });
  it.each([
    "../outside",
    "generated/../../outside",
    "C:/Windows/system.ini",
    "/etc/passwd",
    "generated\\..\\secret",
    "generated/%2e%2e/secret",
    "generated//secret",
    "books/./secret",
    "temp/file:stream",
    "generated/../x",
    "unknown/file.png",
  ])("rejects unsafe key %s", (key) => {
    expect(() => resolveStorageKey(root, key)).toThrow();
  });
});
