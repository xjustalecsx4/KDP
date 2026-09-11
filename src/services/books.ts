import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/policies";
import { LocalStorage } from "./storage";
export async function uploadAsset(bookId: string, type: string, file: File) {
  if (
    ![
      "COVER",
      "BACK_COVER",
      "INTERIOR_PAGE",
      "MARKETING_IMAGE",
      "OTHER",
    ].includes(type)
  )
    throw new ActionError("Invalid asset type.");
  if (!(await db.book.findUnique({ where: { id: bookId } })))
    throw new ActionError("Book not found.");
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    throw new ActionError("Images must be between 1 byte and 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const formats: Record<string, string[]> = {
    jpeg: ["jpg", "jpeg"],
    png: ["png"],
    webp: ["webp"],
  };
  const data = Buffer.from(await file.arrayBuffer());
  const pipeline = sharp(data, {
    limitInputPixels: 30_000_000,
    failOn: "warning",
  });
  const metadata = await pipeline.metadata();
  if (
    !metadata.format ||
    !extension ||
    !formats[metadata.format]?.includes(extension) ||
    file.type !== `image/${metadata.format}` ||
    (metadata.pages ?? 1) > 1
  )
    throw new ActionError(
      "Upload a valid, non-animated JPG, PNG, or WEBP image with matching file type.",
    );
  const thumbnail = await pipeline
    .rotate()
    .resize({
      width: 420,
      height: 560,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  const key = `books/${randomUUID()}.${extension}`;
  const thumbnailKey = `books/${randomUUID()}.webp`;
  const storage = new LocalStorage();
  await storage.write(key, data);
  await storage.write(thumbnailKey, thumbnail);
  // If the DB write fails, files stay untracked and are never silently deleted.
  return db.bookAsset.create({
    data: {
      bookId,
      type,
      name: file.name.replace(/[\\/\x00-\x1f]/g, "_").slice(0, 200),
      files: {
        create: [
          {
            role: "SOURCE",
            file: {
              create: {
                key,
                category: "BOOK",
                bytes: data.length,
                mimeType: file.type,
              },
            },
          },
          {
            role: "THUMBNAIL",
            file: {
              create: {
                key: thumbnailKey,
                category: "BOOK",
                bytes: thumbnail.length,
                mimeType: "image/webp",
              },
            },
          },
        ],
      },
    },
  });
}
