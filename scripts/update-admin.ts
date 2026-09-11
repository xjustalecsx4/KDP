import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { db } from "../src/lib/db";
async function main() {
  const input = z
    .object({
      email: z.email(),
      password: z.string().min(12).max(128),
      name: z.string().min(1).max(100),
    })
    .parse({
      email: process.env.NEW_ADMIN_EMAIL,
      password: process.env.NEW_ADMIN_PASSWORD,
      name: process.env.NEW_ADMIN_NAME ?? "Admin",
    });
  const hash = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7312402)`;
    const users = await tx.user.findMany({ where: { isAdmin: true } });
    if (users.length !== 1) throw new Error("Ambiguous administrator");
    const user = users[0];
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: input.email.toLowerCase(),
        emailVerified: false,
        name: input.name,
      },
    });
    const result = await tx.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hash },
    });
    if (result.count !== 1) throw new Error("Credential account missing");
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.systemEvent.create({
      data: {
        level: "INFO",
        source: "auth",
        message: "Account security updated",
        actorId: user.id,
      },
    });
  });
  console.log("Administrator updated; previous sessions revoked.");
}
main()
  .catch(() => {
    console.error("Administrator update failed. Check input and database.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
