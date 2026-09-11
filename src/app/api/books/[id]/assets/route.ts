import { requireAdmin } from "@/server/authorization";
import { uploadAsset } from "@/services/books";
import { ActionError } from "@/lib/policies";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  if (
    request.headers.get("origin") !==
    (process.env.APP_URL ?? "http://localhost:3000")
  )
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  try {
    const max = 11 * 1024 * 1024;
    if (Number(request.headers.get("content-length")) > max)
      return Response.json({ error: "Upload exceeds 10 MB." }, { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) throw new ActionError("No upload supplied.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > max) {
        await reader.cancel();
        return Response.json(
          { error: "Upload exceeds 10 MB." },
          { status: 413 },
        );
      }
      chunks.push(result.value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ActionError("Select an image file.");
    await uploadAsset((await params).id, String(form.get("type")), file);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof ActionError
            ? error.message
            : "Upload failed. Check image validity and storage availability.",
      },
      { status: 400 },
    );
  }
}
