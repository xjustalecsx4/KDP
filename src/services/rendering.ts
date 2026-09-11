import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { renderInputSchema, type RenderInput } from "@/lib/content";
import { LocalStorage } from "./storage";
export type RenderedFile = {
  key: string;
  data: Buffer;
  mimeType: string;
  category: "IMAGE" | "VIDEO";
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
function lines(text: string, max = 30) {
  const result: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line.length + word.length > max && line) {
      result.push(line);
      line = "";
    }
    line += (line ? " " : "") + word;
  }
  if (line) result.push(line);
  return result.slice(0, 4);
}
const svgText = (
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  width: number,
) =>
  lines(text, Math.floor(width / (size * 0.55)))
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * size * 1.2}" fill="${color}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" font-weight="600">${escape(line)}</text>`,
    )
    .join("");
async function sourceImages(input: RenderInput) {
  const files = await db.storedFile.findMany({
    where: { id: { in: input.fileIds }, state: "ACTIVE" },
  });
  return Promise.all(
    input.fileIds.map(async (id) => {
      const file = files.find((f) => f.id === id);
      if (!file) throw new Error("Input unavailable");
      const buffer = await new LocalStorage().read(file.key);
      const safe = await sharp(buffer, { limitInputPixels: 30_000_000 })
        .rotate()
        .resize({
          width: 1000,
          height: 1400,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
      return `data:image/png;base64,${safe.toString("base64")}`;
    }),
  );
}
async function imageCreative(input: RenderInput, images: string[]) {
  const carousel = input.format === "CAROUSEL";
  const width = carousel ? 1080 : 1000,
    height = carousel ? 1920 : 1500;
  const outputs: RenderedFile[] = [];
  for (let i = 0; i < (carousel ? images.length : 1); i++) {
    const headline =
      carousel && i > 0
        ? input.concept.slideTexts[
            Math.min(i, input.concept.slideTexts.length - 1)
          ]
        : input.concept.hook;
    const bottom =
      carousel && i === images.length - 1
        ? input.concept.endingQuestion
        : input.concept.cta;
    const imageY = carousel ? 430 : 390,
      imageH = carousel ? 950 : 780;
    const body =
      !carousel && input.template === "pinterest-preview" && images.length > 1
        ? `<image href="${images[0]}" x="90" y="${imageY + 40}" width="380" height="${imageH - 80}" preserveAspectRatio="xMidYMid meet"/><image href="${images[1]}" x="510" y="${imageY}" width="400" height="${imageH}" preserveAspectRatio="xMidYMid meet"/>`
        : `<image href="${images[carousel ? i : images.length - 1]}" x="100" y="${imageY}" width="${width - 200}" height="${imageH}" preserveAspectRatio="xMidYMid meet"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${input.configuration.background}"/>${svgText(headline, width / 2, 200, headline.length > 95 ? 44 : 60, input.configuration.foreground, width - 200)}${body}${svgText(input.bookTitle, width / 2, carousel ? 1410 : height - 270, input.bookTitle.length > 100 ? 24 : 34, input.configuration.foreground, width - 200)}${svgText(bottom, width / 2, carousel ? 1560 : height - 130, 30, input.configuration.accent, width - 200)}</svg>`;
    outputs.push({
      key: `generated/${randomUUID()}.png`,
      data: await sharp(Buffer.from(svg)).png().toBuffer(),
      mimeType: "image/png",
      category: "IMAGE",
    });
  }
  return outputs;
}
async function videoCreative(input: RenderInput, images: string[]) {
  const executable = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (!executable) throw new Error("Renderer browser unavailable");
  const directory = await mkdtemp(path.join(tmpdir(), "kdp-remotion-"));
  try {
    const { bundle } = await import("@remotion/bundler");
    const { selectComposition, renderMedia } =
      await import("@remotion/renderer");
    const serveUrl = await bundle({
      entryPoint: path.resolve("src/templates/video/index.tsx"),
      outDir: path.join(directory, "bundle"),
    });
    const inputProps = { input, images };
    const composition = await selectComposition({
      serveUrl,
      id: "BookReveal",
      inputProps,
      browserExecutable: executable,
      logLevel: "error",
    });
    const output = path.join(directory, "video.mp4");
    await renderMedia({
      composition,
      serveUrl,
      inputProps,
      codec: "h264",
      outputLocation: output,
      browserExecutable: executable,
      concurrency: 2,
      x264Preset: "veryfast",
      logLevel: "error",
    });
    return [
      {
        key: `renders/${randomUUID()}.mp4`,
        data: await readFile(output),
        mimeType: "video/mp4",
        category: "VIDEO" as const,
      },
    ];
  } finally {
    if (
      path.resolve(directory).startsWith(path.join(tmpdir(), "kdp-remotion-"))
    )
      await rm(directory, { recursive: true, force: true });
  }
}
export async function renderJobInput(value: unknown) {
  const input = renderInputSchema.parse(value);
  const images = await sourceImages(input);
  const outputs =
    input.format === "VIDEO"
      ? await videoCreative(input, images)
      : await imageCreative(input, images);
  for (const output of outputs)
    await new LocalStorage().write(output.key, output.data);
  return outputs;
}
