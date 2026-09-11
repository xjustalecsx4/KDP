import { z } from "zod";
import { db } from "@/lib/db";
import { ActionError } from "@/lib/policies";
import { renderInputSchema, bookSchema } from "@/lib/content";
import { queueTransaction } from "./jobs";
import { getSettings } from "./settings";
import { audit } from "./events";
import { LocalStorage } from "./storage";
import { pinterestToken } from "./pinterest";
import {
  pinterestConfigured,
  pinterestRequest,
  PinterestError,
  boardsSchema,
  boardSchema,
} from "./pinterest-api";
export function schedulerEnabled() {
  return (
    process.env.PINTEREST_PUBLISHING_ENABLED === "true" && pinterestConfigured()
  );
}
export const publishInput = z
  .object({
    boardId: z.string().regex(/^\d+$/),
    fileId: z.string().min(1),
    title: z.string().min(1).max(100),
    description: z.string().max(800),
    link: z.url().refine((v) => new URL(v).protocol === "https:"),
    accountName: z.string().min(1),
  })
  .strict();
export async function schedulePinterest(
  contentId: string,
  boardId: string,
  when: Date,
  actorId: string,
) {
  if (!schedulerEnabled())
    throw new ActionError(
      "Pinterest publishing is disabled. Complete app setup and enable it on the server first.",
    );
  if (!Number.isFinite(when.getTime()) || when.getTime() < Date.now() + 60000)
    throw new ActionError(
      "Choose a time at least one minute in the future, including its timezone offset.",
    );
  const settings = await getSettings();
  return queueTransaction(async (tx) => {
    const account = await tx.platformAccount.findUnique({
      where: { platform: "PINTEREST" },
    });
    if (!account?.connected || !account.externalAccountId)
      throw new ActionError("Connect Pinterest first.");
    const boardData = await tx.appSetting.findUnique({
      where: { key: "pinterest-boards" },
    });
    const boards = boardsSchema.safeParse(boardData?.value);
    if (!boards.success || !boards.data.items.some((b) => b.id === boardId))
      throw new ActionError("Choose a synchronized board.");
    const content = await tx.contentItem.findUnique({
      where: { id: contentId },
      include: {
        book: true,
        variants: { orderBy: { createdAt: "desc" }, take: 1 },
        files: { where: { role: "OUTPUT" }, include: { file: true } },
        posts: { include: { job: true } },
      },
    });
    if (
      !content ||
      content.status !== "APPROVED" ||
      content.platform !== "PINTEREST" ||
      content.format !== "IMAGE"
    )
      throw new ActionError("Approve a rendered Pinterest image first.");
    if (
      content.posts.some(
        (p) => p.status !== "CANCELLED" || p.job?.requiresReconciliation,
      )
    )
      throw new ActionError(
        "This content already has a publishing schedule or history. Manage it in Scheduler.",
      );
    const file = content.files[0]?.file;
    if (
      !file ||
      file.state !== "ACTIVE" ||
      !["image/png", "image/jpeg"].includes(file.mimeType)
    )
      throw new ActionError("Rendered image unavailable.");
    const validatedBook = {
      amazonUrl: bookSchema.shape.amazonUrl.parse(content.book.amazonUrl ?? ""),
    };
    if (!validatedBook.amazonUrl)
      throw new ActionError("Add the book's Amazon URL before scheduling.");
    const concept = renderInputSchema.parse(content.variants[0]?.data).concept;
    const input = publishInput.parse({
      boardId,
      fileId: file.id,
      title: concept.hook.slice(0, 100),
      description: (concept.caption + "\n" + concept.hashtags.join(" ")).slice(
        0,
        800,
      ),
      link: validatedBook.amazonUrl,
      accountName: account.externalAccountId,
    });
    const post = await tx.scheduledPost.create({
      data: {
        contentId,
        platform: "PINTEREST",
        platformAccountId: account.id,
        scheduledAt: when,
        timezone: settings.timezone,
        files: { create: { fileId: file.id, role: "OUTPUT" } },
        job: {
          create: {
            type: "PUBLISH",
            contentId,
            input,
            availableAt: when,
            maxAttempts: settings.publishRetryLimit,
            files: { create: { fileId: file.id, role: "SOURCE" } },
          },
        },
      },
    });
    await audit(tx, "SCHEDULE_CREATED", { actorId, platform: "PINTEREST" });
    return post.id;
  });
}
export async function processPinterest(workerId: string) {
  if (!schedulerEnabled()) return false;
  const settings = await getSettings();
  const claimed = await queueTransaction(async (tx) => {
    // Conservative local daily cap and minimum spacing, shared by all workers.
    const latest = await tx.publishAttempt.findFirst({
      where: { post: { platform: "PINTEREST" } },
      orderBy: { createdAt: "desc" },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 60000) return null;
    if (
      (await tx.publishAttempt.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 86400000) },
          post: { platform: "PINTEREST" },
        },
      })) >= 20
    )
      return null;
    const jobs = await tx.renderJob.findMany({
      where: {
        type: "PUBLISH",
        status: "PENDING",
        availableAt: { lte: new Date() },
        requiresReconciliation: false,
        criticalOperation: false,
        scheduledPost: { is: { platform: "PINTEREST", status: "SCHEDULED" } },
      },
      orderBy: { availableAt: "asc" },
      take: 20,
      include: { scheduledPost: true },
    });
    const job = jobs.find(
      (j) =>
        j.attemptCount < j.maxAttempts &&
        (settings.schedulingBehavior !== "HOLD_OVERDUE" ||
          Date.now() - j.availableAt.getTime() <=
            Math.max(60000, (settings.workerPollingSeconds + 15) * 1000)),
    );
    if (!job || !job.scheduledPostId) return null;
    // Refuse simultaneous publishing jobs, even across multiple worker processes.
    if (
      await tx.renderJob.count({
        where: { type: "PUBLISH", status: "PROCESSING" },
      })
    )
      return null;
    await tx.renderJob.update({
      where: { id: job.id },
      data: {
        status: "PROCESSING",
        startedAt: new Date(),
        workerId,
        leaseExpiresAt: new Date(Date.now() + 60000),
        attemptCount: { increment: 1 },
      },
    });
    await tx.scheduledPost.update({
      where: { id: job.scheduledPostId },
      data: { status: "PUBLISHING", attemptCount: { increment: 1 } },
    });
    const attempt = await tx.publishAttempt.create({
      data: { scheduledPostId: job.scheduledPostId, status: "PROCESSING" },
    });
    await audit(tx, "JOB_STARTED", {
      source: "worker",
      jobId: job.id,
      platform: "PINTEREST",
    });
    return { job, attempt };
  });
  if (!claimed) return false;
  const { job, attempt } = claimed;
  let critical = false;
  try {
    const input = publishInput.parse(job.input);
    const token = await pinterestToken();
    const account = await db.platformAccount.findUnique({
      where: { platform: "PINTEREST" },
    });
    if (!account?.connected || account.externalAccountId !== input.accountName)
      throw new ActionError("Account changed");
    boardSchema.parse(
      await pinterestRequest("/boards/" + input.boardId, {
        headers: { Authorization: "Bearer " + token },
      }),
    );
    const file = await db.storedFile.findFirst({
      where: {
        id: input.fileId,
        state: "ACTIVE",
        references: { some: { scheduledPostId: job.scheduledPostId } },
      },
    });
    if (
      !file ||
      file.bytes > 10_000_000n ||
      !["image/png", "image/jpeg"].includes(file.mimeType)
    )
      throw Error("Image unavailable");
    const data = await new LocalStorage().read(file.key);
    await queueTransaction(async (tx) => {
      const current = await tx.renderJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      const content = await tx.contentItem.findUnique({
        where: { id: job.contentId! },
      });
      if (
        current.status !== "PROCESSING" ||
        current.workerId !== workerId ||
        !current.leaseExpiresAt ||
        current.leaseExpiresAt < new Date() ||
        content?.status !== "APPROVED"
      )
        throw Error("Ownership or approval changed");
      await tx.renderJob.update({
        where: { id: job.id },
        data: { criticalOperation: true },
      });
    });
    critical = true;
    const result = z.object({ id: z.string().regex(/^\d+$/) }).parse(
      await pinterestRequest(
        "/pins",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            board_id: input.boardId,
            title: input.title,
            description: input.description,
            link: input.link,
            media_source: {
              source_type: "image_base64",
              content_type: file.mimeType,
              data: data.toString("base64"),
            },
          }),
        },
        true,
      ),
    );
    await queueTransaction(async (tx) => {
      const current = await tx.renderJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      if (current.workerId !== workerId || current.status !== "PROCESSING")
        throw Error("Ownership lost");
      await tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          criticalOperation: false,
          leaseExpiresAt: null,
          errorCode: null,
          errorMessage: null,
        },
      });
      await tx.scheduledPost.update({
        where: { id: job.scheduledPostId! },
        data: { status: "PUBLISHED" },
      });
      await tx.contentItem.update({
        where: { id: job.contentId! },
        data: { status: "PUBLISHED" },
      });
      await tx.publishAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "PUBLISHED",
          externalPostId: result.id,
          completedAt: new Date(),
        },
      });
      await tx.platformAccount.update({
        where: { platform: "PINTEREST" },
        data: { lastSuccessfulRequestAt: new Date(), lastError: null },
      });
      await audit(tx, "JOB_COMPLETED", {
        source: "worker",
        jobId: job.id,
        platform: "PINTEREST",
      });
    });
  } catch (error) {
    const uncertain =
      critical && (!(error instanceof PinterestError) || error.uncertain);
    await queueTransaction(async (tx) => {
      const current = await tx.renderJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      if (current.status !== "PROCESSING" || current.workerId !== workerId)
        return;
      const retry =
        !uncertain &&
        error instanceof PinterestError &&
        error.retryable &&
        current.attemptCount < current.maxAttempts;
      await tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: retry ? "PENDING" : "FAILED",
          requiresReconciliation: uncertain,
          criticalOperation: false,
          leaseExpiresAt: null,
          completedAt: retry ? null : new Date(),
          availableAt: new Date(Date.now() + 300000),
          errorCode: uncertain ? "PUBLISH_UNCERTAIN" : "PLATFORM_FAILED",
          errorMessage: uncertain
            ? "Publishing outcome uncertain. Review the account before any further action."
            : "Pinterest request failed. Check the connection and permissions.",
        },
      });
      await tx.scheduledPost.update({
        where: { id: job.scheduledPostId! },
        data: {
          status: retry ? "SCHEDULED" : "FAILED",
          ...(retry ? { scheduledAt: new Date(Date.now() + 300000) } : {}),
        },
      });
      await tx.publishAttempt.update({
        where: { id: attempt.id },
        data: {
          status: uncertain ? "UNCERTAIN" : "FAILED",
          completedAt: new Date(),
          errorMessage: uncertain
            ? "Publishing outcome uncertain"
            : "Pinterest request failed",
        },
      });
      await tx.platformAccount.updateMany({
        where: { platform: "PINTEREST" },
        data: { lastError: "PLATFORM_FAILED" },
      });
      await audit(tx, "JOB_FAILED", {
        source: "worker",
        jobId: job.id,
        level: "ERROR",
        platform: "PINTEREST",
      });
    });
  } finally {
    await db.workerHeartbeat.updateMany({
      where: { id: workerId },
      data: { lastActivityAt: new Date() },
    });
  }
  return true;
}

// Resolve only a positively identified publication. An unconfirmed outcome never becomes retryable.
export async function reconcilePinterest(
  postId: string,
  pinId: string,
  actorId: string,
) {
  if (!/^\d{1,100}$/.test(pinId))
    throw new ActionError("Enter the numeric Pinterest Pin ID.");
  const post = await db.scheduledPost.findUnique({
    where: { id: postId },
    include: { job: true },
  });
  if (
    post?.platform !== "PINTEREST" ||
    !post.job?.requiresReconciliation ||
    post.job.status !== "FAILED"
  )
    throw new ActionError("This post does not need reconciliation.");
  const input = publishInput.parse(post.job.input);
  const token = await pinterestToken();
  const account = await db.platformAccount.findUnique({
    where: { platform: "PINTEREST" },
  });
  if (account?.externalAccountId !== input.accountName)
    throw new ActionError("The connected account has changed.");
  const pin = z
    .object({
      id: z.string(),
      board_id: z.string(),
      title: z.string().nullable(),
      description: z.string().nullable(),
      link: z.string().nullable(),
    })
    .parse(
      await pinterestRequest("/pins/" + pinId, {
        headers: { Authorization: "Bearer " + token },
      }),
    );
  if (
    pin.id !== pinId ||
    pin.board_id !== input.boardId ||
    pin.title !== input.title ||
    pin.description !== input.description ||
    pin.link !== input.link
  )
    throw new ActionError(
      "This Pin does not match the scheduled board, text and link. The job remains blocked.",
    );
  await queueTransaction(async (tx) => {
    const current = await tx.renderJob.findUniqueOrThrow({
      where: { id: post.job!.id },
    });
    if (!current.requiresReconciliation || current.status !== "FAILED")
      throw new ActionError("The job changed. Refresh before continuing.");
    if (
      await tx.publishAttempt.count({
        where: { externalPostId: pinId, scheduledPostId: { not: postId } },
      })
    )
      throw new ActionError(
        "This Pin is already linked to another publication.",
      );
    await tx.publishAttempt.create({
      data: {
        scheduledPostId: postId,
        status: "RECONCILED",
        externalPostId: pinId,
        completedAt: new Date(),
      },
    });
    await tx.renderJob.update({
      where: { id: current.id },
      data: {
        status: "COMPLETED",
        requiresReconciliation: false,
        criticalOperation: false,
        errorCode: null,
        errorMessage: null,
        completedAt: new Date(),
        leaseExpiresAt: null,
      },
    });
    await tx.scheduledPost.update({
      where: { id: postId },
      data: { status: "PUBLISHED" },
    });
    await tx.contentItem.update({
      where: { id: post.contentId },
      data: { status: "PUBLISHED" },
    });
    await audit(tx, "PUBLISH_RECONCILED", {
      actorId,
      jobId: current.id,
      platform: "PINTEREST",
    });
  });
}
