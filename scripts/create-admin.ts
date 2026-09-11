import { randomUUID } from "node:crypto";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/lib/db";
import { initializeStorage } from "../src/services/storage";
// Pass credentials as environment variables, never command-line arguments or tracked files.
async function main() {
  const input = z
    .object({
      email: z.email(),
      password: z.string().min(12).max(128),
      name: z.string().min(1).max(100),
    })
    .parse({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME ?? "Administrator",
    });
  const password = await hashPassword(input.password);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7312402)`;
    if (await tx.user.count())
      throw new Error("An account already exists; bootstrap is disabled.");
    const id = randomUUID();
    await tx.user.create({
      data: {
        id,
        email: input.email.toLowerCase(),
        name: input.name,
        isAdmin: true,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            password,
          },
        },
      },
    });
  });
  await initializeStorage();
  console.log(
    "Administrator created and private storage initialized. Remove ADMIN_PASSWORD from your environment.",
  );
}
main()
  .catch(() => {
    console.error(
      "Administrator setup failed. Verify input, database migrations, and that no user already exists.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
