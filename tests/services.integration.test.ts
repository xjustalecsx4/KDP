import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
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
    await db.renderJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        criticalOperation: false,
        requiresReconciliation: true,
      },
    });
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

  it("schedules exactly once, publishes once, and holds uncertain Pinterest outcomes", async () => {
    const { schedulePinterest, processPinterest, reconcilePinterest } =
      await import("../src/services/pinterest-publishing");
    const { beginPinterest, completePinterest } =
      await import("../src/services/pinterest");
    const { scopes } = await import("../src/services/pinterest-api");
    const oldAccount = await db.platformAccount.findUnique({
      where: { platform: "PINTEREST" },
    });
    if (oldAccount)
      throw new Error(
        "Use an isolated database without a Pinterest connection for this test.",
      );
    const oldBoards = await db.appSetting.findUnique({
      where: { key: "pinterest-boards" },
    });
    const oldSettings = await db.appSetting.findUnique({
      where: { key: "operational" },
    });
    const { defaults } = await import("../src/lib/policies");
    const workerId = prefix + "-worker";
    let postIds: string[] = [];
    const contentIds = [prefix + "-pin-ok", prefix + "-pin-uncertain"];
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("APP_ENCRYPTION_KEY", "ab".repeat(32));
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("PINTEREST_CLIENT_ID", "test-id");
    vi.stubEnv("PINTEREST_CLIENT_SECRET", "test-secret");
    vi.stubEnv("PINTEREST_PUBLISHING_ENABLED", "true");
    try {
      const started = await beginPinterest(actor, "test-session");
      await expect(
        completePinterest(
          started.state,
          "test-code",
          actor,
          "different-session",
        ),
      ).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
      fetchMock
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              access_token: "test-token",
              refresh_token: "test-refresh",
              expires_in: 3600,
              scope: scopes.join(" "),
              token_type: "bearer",
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ username: "test-owner" })),
        );
      await completePinterest(
        started.state,
        "test-code",
        actor,
        "test-session",
      );
      await expect(
        completePinterest(started.state, "test-code", actor, "test-session"),
      ).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(2);
      fetchMock.mockReset();
      const account = await db.platformAccount.findUniqueOrThrow({
        where: { platform: "PINTEREST" },
      });
      expect(account.encryptedAccessToken).not.toContain("test-token");
      await db.appSetting.upsert({
        where: { key: "pinterest-boards" },
        create: {
          key: "pinterest-boards",
          value: { items: [{ id: "123", name: "Test board" }] },
        },
        update: { value: { items: [{ id: "123", name: "Test board" }] } },
      });
      await db.appSetting.upsert({
        where: { key: "operational" },
        create: {
          key: "operational",
          value: { ...defaults, schedulingBehavior: "PUBLISH_WHEN_AVAILABLE" },
        },
        update: {
          value: { ...defaults, schedulingBehavior: "PUBLISH_WHEN_AVAILABLE" },
        },
      });
      await db.workerHeartbeat.create({ data: { id: workerId } });
      await db.book.create({
        data: {
          id: prefix + "-pin-book",
          title: "Test book",
          amazonUrl: "https://www.amazon.com/dp/B012345678",
          themes: [],
          keywords: [],
          contentAngles: [],
        },
      });
      for (const contentId of contentIds) {
        await db.contentItem.create({
          data: {
            id: contentId,
            bookId: prefix + "-pin-book",
            platform: "PINTEREST",
            format: "IMAGE",
            title: "Test image",
            status: "APPROVED",
            variants: {
              create: {
                data: {
                  bookTitle: "Test book",
                  fileIds: [contentId + "-image"],
                  template: "pinterest-preview",
                  platform: "PINTEREST",
                  format: "IMAGE",
                  configuration: {
                    background: "#ffffff",
                    foreground: "#000000",
                    accent: "#ffaa00",
                  },
                  concept: {
                    hook: "A closer look",
                    caption: "A book preview",
                    cta: "Discover",
                    hashtags: [],
                    slideTexts: ["A page"],
                    endingQuestion: "Which page?",
                  },
                },
              },
            },
          },
        });
        await writeFile(
          path.join(root, "generated", contentId + ".png"),
          "test-image",
        );
        await db.storedFile.create({
          data: {
            id: contentId + "-image",
            key: "generated/" + contentId + ".png",
            category: "IMAGE",
            bytes: 10,
            mimeType: "image/png",
            references: {
              create: { id: contentId + "-ref", role: "OUTPUT", contentId },
            },
          },
        });
      }
      const concurrent = await Promise.allSettled([
        schedulePinterest(
          contentIds[0],
          "123",
          new Date(Date.now() + 120000),
          actor,
        ),
        schedulePinterest(
          contentIds[0],
          "123",
          new Date(Date.now() + 120000),
          actor,
        ),
      ]);
      expect(concurrent.filter((x) => x.status === "fulfilled")).toHaveLength(
        1,
      );
      postIds = (
        await db.scheduledPost.findMany({
          where: { contentId: { in: contentIds } },
        })
      ).map((p) => p.id);
      await db.renderJob.updateMany({
        where: { scheduledPostId: postIds[0] },
        data: { availableAt: new Date(Date.now() - 1000) },
      });
      fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
        if (url.includes("/boards/"))
          return new Response(
            JSON.stringify({ id: "123", name: "Test board" }),
          );
        if (url.endsWith("/pins")) {
          await expect(
            jobs.mutateSchedule(postIds[0], "cancel", actor),
          ).rejects.toThrow();
          const body = JSON.parse(String(init.body));
          expect(body.media_source.source_type).toBe("image_base64");
          return new Response(JSON.stringify({ id: "987" }));
        }
        throw Error("Unexpected request");
      });
      expect(await processPinterest(workerId)).toBe(true);
      expect(
        (
          await db.scheduledPost.findUniqueOrThrow({
            where: { id: postIds[0] },
          })
        ).status,
      ).toBe("PUBLISHED");
      expect(await processPinterest(workerId)).toBe(false);
      await expect(
        schedulePinterest(
          contentIds[0],
          "123",
          new Date(Date.now() + 120000),
          actor,
        ),
      ).rejects.toThrow();
      const second = await schedulePinterest(
        contentIds[1],
        "123",
        new Date(Date.now() + 120000),
        actor,
      );
      postIds.push(second);
      await db.publishAttempt.updateMany({
        where: { scheduledPostId: postIds[0] },
        data: { createdAt: new Date(Date.now() - 120000) },
      });
      await db.renderJob.updateMany({
        where: { scheduledPostId: second },
        data: { availableAt: new Date(Date.now() - 1000) },
      });
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes("/boards/"))
          return new Response(
            JSON.stringify({ id: "123", name: "Test board" }),
          );
        throw Error("simulated network loss");
      });
      expect(await processPinterest(workerId)).toBe(true);
      const failed = await db.renderJob.findUniqueOrThrow({
        where: { scheduledPostId: second },
      });
      expect(failed.requiresReconciliation).toBe(true);
      expect(failed.status).toBe("FAILED");
      fetchMock.mockResolvedValue(new Response(JSON.stringify({id:"456",board_id:"999",title:"Wrong",description:"Wrong",link:"https://example.com"})));
      await expect(reconcilePinterest(second,"456",actor)).rejects.toThrow("does not match");

      await expect(
        jobs.mutateSchedule(second, "retry", actor),
      ).rejects.toThrow();
      await expect(
        schedulePinterest(
          contentIds[1],
          "123",
          new Date(Date.now() + 120000),
          actor,
        ),
      ).rejects.toThrow();

      fetchMock.mockResolvedValue(new Response(JSON.stringify({id:"456",board_id:"123",title:"A closer look",description:"A book preview\n",link:"https://www.amazon.com/dp/B012345678"})));
      await reconcilePinterest(second,"456",actor);
      expect((await db.scheduledPost.findUniqueOrThrow({where:{id:second}})).status).toBe("PUBLISHED");
      expect((await db.renderJob.findUniqueOrThrow({where:{scheduledPostId:second}})).requiresReconciliation).toBe(false);
    } finally {
      const posts = await db.scheduledPost.findMany({
        where: { contentId: { in: contentIds } },
      });
      postIds = posts.map((p) => p.id);
      await db.fileReference.deleteMany({
        where: {
          OR: [
            { scheduledPostId: { in: postIds } },
            { job: { is: { contentId: { in: contentIds } } } },
          ],
        },
      });
      await db.publishAttempt.deleteMany({
        where: { scheduledPostId: { in: postIds } },
      });
      await db.renderJob.deleteMany({
        where: { contentId: { in: contentIds } },
      });
      await db.scheduledPost.deleteMany({ where: { id: { in: postIds } } });
      await db.workerHeartbeat.deleteMany({ where: { id: workerId } });
      await db.platformAccount.deleteMany({ where: { platform: "PINTEREST" } });
      await db.appSetting.deleteMany({
        where: { key: { in: ["pinterest-boards", "operational"] } },
      });
      if (oldBoards)
        await db.appSetting.create({
          data: { ...oldBoards, value: oldBoards.value ?? Prisma.JsonNull },
        });
      if (oldSettings)
        await db.appSetting.create({
          data: { ...oldSettings, value: oldSettings.value ?? Prisma.JsonNull },
        });
      await db.verification.deleteMany({
        where: { identifier: { startsWith: "pinterest:" } },
      });
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
});
