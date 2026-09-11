import { NextRequest, NextResponse } from "next/server";
export function proxy(request: NextRequest) {
  const origin = process.env.APP_URL
    ? new URL(process.env.APP_URL).origin
    : "http://localhost:3000";
  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.headers.get("origin") !== origin
  )
    return new NextResponse("Forbidden", { status: 403 });
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'nonce-" +
      nonce +
      "' 'strict-dynamic'" +
      (dev ? " 'unsafe-eval'" : ""),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'" + (dev ? " ws: wss:" : ""),
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://www.pinterest.com",
    ...(origin.startsWith("https:") ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (origin.startsWith("https:"))
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"],
};
