import { createHash } from "node:crypto";
import { z } from "zod";
export const bookSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(300).default(""),
  asin: z.string().trim().max(20).default(""),
  amazonUrl: z
    .union([
      z.literal(""),
      z.url().refine((v) => {
        const u = new URL(v);
        const domains = ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.es", "amazon.it", "amazon.ca", "amazon.com.au", "amazon.co.jp", "amazon.in", "amazon.com.br", "amazon.com.mx", "amazon.nl", "amazon.se", "amazon.pl", "amazon.com.be", "amazon.ie", "amazon.sg", "amazon.ae", "amazon.sa", "amazon.com.tr"];
        return (
          u.protocol === "https:" && domains.some(domain => u.hostname === domain || u.hostname.endsWith(`.${domain}`))
        );
      }, "Use an HTTPS Amazon URL"),
    ])
    .default(""),
  description: z.string().max(10000).default(""),
  audience: z.string().trim().min(1).max(100).default("general"),
  category: z.string().max(100).default(""),
  language: z.string().min(2).max(20).default("en"),
  tone: z.string().max(200).default(""),
  themes: z.array(z.string().max(100)).max(30).default([]),
  keywords: z.array(z.string().max(100)).max(30).default([]),
  contentAngles: z.array(z.string().max(100)).max(30).default([]),
});
export const conceptSchema = z
  .object({
    hook: z.string().trim().min(1).max(140),
    caption: z.string().trim().min(1).max(2200),
    cta: z.string().max(100),
    hashtags: z.array(z.string().max(50)).max(15),
    slideTexts: z.array(z.string().max(120)).min(1).max(7),
    endingQuestion: z.string().max(140),
  })
  .strict();
export const renderInputSchema = z
  .object({
    concept: conceptSchema,
    bookTitle: z.string().max(200),
    fileIds: z.array(z.string().min(1).max(100)).min(1).max(7),
    template: z.enum([
      "pinterest-preview",
      "pinterest-focus",
      "tiktok-carousel",
      "cozy-reveal",
      "fact-explainer",
    ]),
    platform: z.enum(["PINTEREST", "TIKTOK"]),
    format: z.enum(["IMAGE", "CAROUSEL", "VIDEO"]),
    configuration: z
      .object({
        background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        foreground: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      })
      .strict(),
  })
  .strict();
export type Concept = z.infer<typeof conceptSchema>;
export type RenderInput = z.infer<typeof renderInputSchema>;
export function fingerprint(bookId: string, input: RenderInput) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        bookId,
        normalize(input.concept.hook),
        normalize(input.concept.caption),
        input.template,
        [...input.fileIds].sort(),
      ]),
    )
    .digest("hex");
}
export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function similarity(a: string, b: string) {
  const left = new Set(normalize(a).split(" ").filter(Boolean));
  const right = new Set(normalize(b).split(" ").filter(Boolean));
  const union = new Set([...left, ...right]);
  return union.size
    ? [...left].filter((v) => right.has(v)).length / union.size
    : 1;
}
