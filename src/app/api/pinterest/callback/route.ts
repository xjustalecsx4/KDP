import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { requireAdmin } from "@/server/authorization";
import { completePinterest } from "@/services/pinterest";
export async function GET(request: Request) {
  const { user, session } = await requireAdmin();
  const jar = await cookies();
  const expected = jar.get("pinterest-state")?.value;
  jar.set("pinterest-state", "", {
    path: "/api/pinterest",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://"),
  });
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  let ok = false;
  try {
    if (
      !expected ||
      state.length > 100 ||
      code.length > 4096 ||
      !code ||
      Buffer.byteLength(state) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(expected))
    )
      throw Error();
    await completePinterest(state, code, user.id, session.id);
    ok = true;
  } catch {}
  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><title>Pinterest connection</title><body><h1>' +
      (ok ? "Pinterest connected" : "Pinterest connection failed") +
      "</h1><p>" +
      (ok
        ? "Return to Admin and test the connection to synchronize your boards."
        : "The authorization was cancelled, expired, or unavailable. Start again from Admin.") +
      '</p><a href="/admin/platforms">Return to platform management</a></body></html>',
    {
      status: ok ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
