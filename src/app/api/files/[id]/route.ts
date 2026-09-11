import { requireAdmin } from "@/server/authorization";
import { db } from "@/lib/db";
import { LocalStorage } from "@/services/storage";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const file = await db.storedFile.findFirst({
    where: { id: (await params).id, state: "ACTIVE", references: { some: {} } },
    select: { key: true, mimeType: true },
  });
  if (
    !file ||
    !["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(
      file.mimeType,
    )
  )
    return new Response("Not found", { status: 404 });
  try {
    return new Response(
      new Uint8Array(await new LocalStorage().read(file.key)),
      {
        headers: {
          "Content-Type": file.mimeType,
          "Cache-Control": "private, no-store",
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new Response("File unavailable", { status: 404 });
  }
}
