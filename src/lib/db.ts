import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { prisma?: PrismaClient };
export const db =
  globalDb.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        process.env.DATABASE_URL ?? "postgresql://localhost:5432/kdp",
      connectionTimeoutMillis: 3000,
      query_timeout: 5000,
      max: 5,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.prisma = db;
