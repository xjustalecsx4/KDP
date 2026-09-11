import "server-only";
import { db } from "@/lib/db";
import { kdpSchema } from "@/lib/kdp";
export async function publicKdpResources() {
  const books = await db.book.findMany({
    where: { kdpPublic: true },
    select: { title: true, kdpDescription: true, kdpDownloadUrl: true },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return books.filter(
    (book) => kdpSchema.safeParse({ ...book, kdpPublic: true }).success,
  );
}
