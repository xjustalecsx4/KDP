import { describe, it, expect } from "vitest";
import { kdpSchema } from "../src/lib/kdp";
describe("KDP links and publication validation", () => {
  it("accepts a private empty draft and a complete published resource", () => {
    expect(
      kdpSchema.safeParse({
        kdpDescription: "",
        kdpDownloadUrl: "",
        kdpPublic: false,
      }).success,
    ).toBe(true);
    expect(
      kdpSchema.safeParse({
        kdpDescription: "A resource",
        kdpDownloadUrl: "https://example.com/file.pdf",
        kdpPublic: true,
      }).success,
    ).toBe(true);
  });
  it("rejects executable, insecure and credential-bearing links", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,test",
      "http://example.com/file",
      "https://user:password@example.com/file",
    ])
      expect(
        kdpSchema.safeParse({
          kdpDescription: "Resource",
          kdpDownloadUrl: url,
          kdpPublic: true,
        }).success,
      ).toBe(false);
  });
  it("requires a description and link for public resources", () => {
    for (const data of [
      { kdpDescription: "", kdpDownloadUrl: "https://example.com/file" },
      { kdpDescription: "Resource", kdpDownloadUrl: "" },
    ])
      expect(kdpSchema.safeParse({ ...data, kdpPublic: true }).success).toBe(
        false,
      );
  });
});
