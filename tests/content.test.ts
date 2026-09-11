import { describe, expect, it } from "vitest";
import {
  bookSchema,
  conceptSchema,
  fingerprint,
  similarity,
  type RenderInput,
} from "../src/lib/content";
const input: RenderInput = {
  bookTitle: "Test book",
  concept: {
    hook: "A cozy page",
    caption: "A gentle preview",
    cta: "Explore the book",
    hashtags: [],
    slideTexts: ["A page"],
    endingQuestion: "Which page?",
  },
  fileIds: ["a", "b"],
  template: "pinterest-preview",
  platform: "PINTEREST",
  format: "IMAGE",
  configuration: {
    background: "#ffffff",
    foreground: "#222222",
    accent: "#336633",
  },
};
describe("content validation and duplicate prevention", () => {
  it("requires complete, bounded model output", () => {
    expect(conceptSchema.safeParse({ hook: "Only a hook" }).success).toBe(
      false,
    );
    expect(
      conceptSchema.safeParse({ ...input.concept, hook: "a".repeat(141) })
        .success,
    ).toBe(false);
    expect(
      conceptSchema.safeParse({ ...input.concept, command: "ignore policy" })
        .success,
    ).toBe(false);
  });
  it("normalizes exact duplicates independently of punctuation and selection order", () => {
    expect(fingerprint("book", input)).toBe(
      fingerprint("book", {
        ...input,
        fileIds: ["b", "a"],
        concept: { ...input.concept, hook: "A COZY PAGE!" },
      }),
    );
    expect(fingerprint("other-book", input)).not.toBe(
      fingerprint("book", input),
    );
  });
  it("detects near-identical wording without equating unrelated hooks", () => {
    expect(
      similarity(
        "A cozy page for a quiet evening",
        "A cozy page for your quiet evening",
      ),
    ).toBeGreaterThan(0.7);
    expect(similarity("Space facts", "Color a quiet cottage")).toBe(0);
  });
  it("rejects non-HTTPS book links and missing titles", () => {
    expect(bookSchema.safeParse({ title: "" }).success).toBe(false);
    expect(
      bookSchema.safeParse({ title: "Book", amazonUrl: "javascript:alert(1)" })
        .success,
    ).toBe(false);
  });
});
