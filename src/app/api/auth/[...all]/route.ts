import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { logEvent } from "@/services/events";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(request: Request) {
  const response = await handlers.POST(request);
  if (
    new URL(request.url).pathname.endsWith("/sign-in/email") &&
    response.status >= 400
  ) {
    // Never record request bodies, credentials, cookies or headers.
    await logEvent("AUTH_FAILURE", { source: "auth", level: "WARNING" }).catch(
      () => undefined,
    );
  }
  return response;
}
