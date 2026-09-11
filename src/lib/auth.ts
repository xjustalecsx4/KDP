import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

export const auth = betterAuth({
  appName: "KDP Content Automation",
  baseURL: process.env.APP_URL ?? "http://localhost:3000",
  secret: process.env.AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  user: {
    additionalFields: {
      isAdmin: { type: "boolean", defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24,
    updateAge: 60 * 60,
    cookieCache: { enabled: false },
  },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  logger: { disabled: true },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await db.systemEvent.create({
            data: {
              level: "INFO",
              source: "auth",
              message: "Administrator session created",
              actorId: session.userId,
            },
          });
        },
      },
    },
  },
});
