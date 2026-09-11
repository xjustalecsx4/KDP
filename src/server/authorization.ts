import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function requireAdmin() {
  if (!process.env.AUTH_SECRET || !process.env.DATABASE_URL) redirect("/login");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  // Read authoritative permissions for every action, even after session issuance.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, isAdmin: true },
  });
  if (!user?.isAdmin) redirect("/forbidden");
  return { user, session: session.session };
}
