import { timingSafeEqual } from "node:crypto";
import { getHealth } from "@/services/health";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Cache probes briefly so public monitoring cannot spawn a renderer per request.
let cached: { at: number; result: ReturnType<typeof getHealth> } | undefined;
export async function GET(request: Request) {
  if (!cached || Date.now() - cached.at > 30_000)
    cached = { at: Date.now(), result: getHealth() };
  const health = await cached.result;
  const ok =
    health.database === "Healthy" &&
    health.worker === "Healthy" &&
    health.ffmpeg === "Available" &&
    health.remotion === "Available" &&
    health.storage === "Available";
  const expected = process.env.HEALTHCHECK_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer /, "");
  const detailed =
    !!expected &&
    !!supplied &&
    Buffer.byteLength(expected) === Buffer.byteLength(supplied) &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
  return Response.json(
    detailed
      ? { status: ok ? "healthy" : "error", ...health }
      : { status: ok ? "healthy" : "error" },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
