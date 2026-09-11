import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/authorization";
import { beginPinterest } from "@/services/pinterest";
import { ActionError } from "@/lib/policies";
export async function POST() {
  const { user, session } = await requireAdmin();
  try {
    const result = await beginPinterest(user.id, session.id);
    (await cookies()).set("pinterest-state", result.state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_URL?.startsWith("https://"),
      maxAge: 600,
      path: "/api/pinterest",
    });
    return NextResponse.redirect(result.url, 303);
  } catch (error) {
    return new NextResponse(
      error instanceof ActionError ? error.message : "Connection unavailable",
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
