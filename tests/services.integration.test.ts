import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
// Opt in against a dedicated migrated database. Never point this at production.
const enabled = !!process.env.TEST_DATABASE_URL;
describe.skipIf(!enabled)("PostgreSQL administrative actions", () => {
  let db: PrismaClient;
  let jobs: typeof import("../src/services/jobs");
  let storage: typeof import("../src/services/storage");
  const prefix = `test-${randomUUID()}`;
  const actor = `${prefix}-actor`;
  let root: string;
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    root = await mkdtemp(path.join(tmpdir(), "kdp-admin-test-"));
    process.env.STORAGE_PATH = root;
    await mkdir(path.join(root, "generated"));
    db = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.TEST_DATABASE_URL,
      }),
    });
    jobs = await import("../src/services/jobs");
    storage = await import("../src/services/storage");
  });
  afterAll(async () => {
    await db.fileReference.deleteMany({
      where: { id: { startsWith: prefix } },
    });
    await db.storedFile.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.renderJob.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.scheduledPost.deleteMany({
      where: { id: { startsWith: prefix } },
    });
    await db.contentItem.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.book.deleteMany({ where: { id: { startsWith: prefix } } });
    await db.systemEvent.deleteMany({ where: { actorId: actor } });
    await db.$disconnect();
    const { db: serviceDb } = await import("../src/lib/db");
    await serviceDb.$disconnect();
    // Only remove the unique directory created by this suite.
    if (root.startsWith(path.join(tmpdir(), "kdp-admin-test-")))
      await rm(root, { recursive: true, force: true });
  });
  it("serializes competing cancel requests, leaving a single valid transition", async () => {
    const id = `${prefix}-cancel`;
    await db.renderJob.create({
      data: {
        id,
        type: "IMAGE_RENDER",
        availableAt: new Date(Date.now() + 86400000),
      },
    });
    const results = await Promise.allSettled([
      jobs.mutateJob(id, "cancel", actor),
      jobs.mutateJob(id, "cancel", actor),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await db.renderJob.findUniqueOrThrow({ where: { id } })).status,
    ).toBe("CANCELLED");
  });
  it("rejects a critical publishing cancellation and uncertain retry", async () => {
    const id = `${prefix}-critical`;
    await db.renderJob.create({
      data: {
        id,
        type: "PUBLISH",
        status: "PROCESSING",
        criticalOperation: true,
        startedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    await expect(jobs.mutateJob(id, "cancel", actor)).rejects.toThrow();
    await db.renderJob.update({
      where: { id },
      data: {
        status: "FAILED",
        criticalOperation: false,
        requiresReconciliation: true,
      },
    });
    await expect(jobs.mutateJob(id, "retry", actor)).rejects.toThrow();
  });
  it("updates schedule and job atomically and refuses changes after publishing starts", async () => {
    const bookId = `${prefix}-book`,
      contentId = `${prefix}-content`,
      postId = `${prefix}-post`,
      jobId = `${prefix}-publish`;
    await db.book.create({
      data: {
        id: bookId,
        title: "Integration test",
        themes: [],
        keywords: [],
        contentAngles: [],
      },
    });
    await db.contentItem.create({
      data: {
        id: contentId,
        bookId,
        platform: "PINTEREST",
        format: "IMAGE",
        title: "Integration test",
      },
    });
    await db.scheduledPost.create({
      data: {
        id: postId,
        contentId,
        platform: "PINTEREST",
        scheduledAt: new Date(Date.now() + 86400000),
        job: { create: { id: jobId, type: "PUBLISH" } },
      },
    });
    const when = new Date(Date.now() + 172800000);
    await jobs.mutateSchedule(postId, "reschedule", actor, when);
    expect(
      (
        await db.renderJob.findUniqueOrThrow({ where: { id: jobId } })
      ).availableAt.toISOString(),
    ).toBe(when.toISOString());
    await db.renderJob.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        criticalOperation: true,
        startedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 86400000),
      },
    });
    await expect(
      jobs.mutateSchedule(postId, "cancel", actor),
    ).rejects.toThrow();
    expect(
      (await db.scheduledPost.findUniqueOrThrow({ where: { id: postId } }))
        .status,
    ).toBe("SCHEDULED");
  });
  it("deletes eligible unreferenced files and preserves scheduled-post files", async () => {
    const postId = `${prefix}-post`;
    const old = new Date(Date.now() - 100 * 86400000);
    for (const suffix of ["unused", "referenced"]) {
      const id = `${prefix}-${suffix}`;
      await writeFile(path.join(root, "generated", `${id}.png`), "test");
      await db.storedFile.create({
        data: {
          id,
          key: `generated/${id}.png`,
          category: "IMAGE",
          bytes: 4,
          mimeType: "image/png",
          createdAt: old,
          ...(suffix === "referenced"
            ? {
                references: {
                  create: { id: `${prefix}-file-ref`, scheduledPostId: postId },
                },
              }
            : {}),
        },
      });
    }
    const result = await storage.cleanupStorage("unreferenced", actor);
    expect(result.removed).toBe(1);
    expect(
      await db.storedFile.findUnique({ where: { id: `${prefix}-unused` } }),
    ).toBeNull();
    expect(
      (await stat(path.join(root, "generated", `${prefix}-referenced.png`)))
        .size,
    ).toBe(4);
  });
});
