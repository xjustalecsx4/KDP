"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./authorization";
import { db } from "@/lib/db";
import {
  bookSchema,
  conceptSchema,
  renderInputSchema,
  fingerprint,
  similarity,
} from "@/lib/content";
import { ActionError } from "@/lib/policies";
import { contentProvider } from "@/services/generation";
import { defaultStyle, templateCatalog } from "@/templates/catalog";
import { queueTransaction } from "@/services/jobs";
import { getSettings } from "@/services/settings";
import type { ActionResult } from "./actions";
export type ContentActionResult = ActionResult & { href?: string };
export async function contentAction(
  _: ContentActionResult,
  form: FormData,
): Promise<ContentActionResult> {
  await requireAdmin();
  try {
    const operation = z.string().parse(form.get("operation"));
    const id = () => z.string().min(1).max(100).parse(form.get("id"));
    let href: string | undefined;
    let message = "Changes saved successfully.";
    if (
      ["delete-book", "delete-content", "delete-asset"].includes(operation) &&
      form.get("confirmed") !== "yes"
    )
      throw new ActionError("Confirm deletion first.");
    if (operation === "save-book") {
      const data: Record<string, unknown> = {};
      for (const key of Object.keys(bookSchema.shape))
        data[key] = ["themes", "keywords", "contentAngles"].includes(key)
          ? String(form.get(key) ?? "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)
          : String(form.get(key) ?? "");
      const parsed = bookSchema.parse(data);
      const bookId = form.get("id");
      const book =
        typeof bookId === "string" && bookId
          ? await db.book.update({ where: { id: bookId }, data: parsed })
          : await db.book.create({ data: parsed });
      href = `/books/${book.id}`;
    } else if (operation === "delete-book") {
      await db.$transaction(async (tx) => {
        if (await tx.contentItem.count({ where: { bookId: id() } }))
          throw new ActionError(
            "Delete this book's content before deleting the book.",
          );
        await tx.bookAsset.deleteMany({ where: { bookId: id() } });
        await tx.book.delete({ where: { id: id() } });
      });
      href = "/books";
      message =
        "Book deleted. Original files remain in private storage for manual review.";
    } else if (operation === "delete-asset") {
      await db.bookAsset.delete({ where: { id: id() } });
      message =
        "Asset removed from the book. Referenced files remain protected.";
    } else if (operation === "generate") {
      const book = await db.book.findUnique({ where: { id: id() } });
      if (!book) throw new ActionError("Book not found.");
      const template = templateCatalog.find(
        (t) => t.id === form.get("template"),
      );
      if (!template) throw new ActionError("Choose a template.");
      const assets = z
        .array(z.string().min(1).max(100))
        .min(
          template.format === "CAROUSEL"
            ? 4
            : template.format === "VIDEO"
              ? 3
              : 1,
        )
        .max(7)
        .parse(form.getAll("assetId"));
      if (new Set(assets).size !== assets.length)
        throw new ActionError("Select distinct book assets.");
      const records = await db.bookAsset.findMany({
        where: { id: { in: assets }, bookId: book.id },
        include: {
          files: { where: { role: "SOURCE" }, include: { file: true } },
        },
      });
      if (records.length !== assets.length)
        throw new ActionError("Selected assets must belong to this book.");
      const fileIds = assets.map((assetId) => {
        const file = records.find((a) => a.id === assetId)?.files[0]?.file;
        if (!file || file.state !== "ACTIVE")
          throw new ActionError("One of the selected files is unavailable.");
        return file.id;
      });
      const concept = await contentProvider().generate(book, {
        platform: template.platform,
        format: template.format,
        pages: assets.length,
        angle: String(form.get("angle") ?? "").slice(0, 200),
      });
      const storedTemplate = await db.creativeTemplate.findUnique({
        where: { id: template.id },
      });
      const input = renderInputSchema.parse({
        concept,
        bookTitle: book.title,
        fileIds,
        template: template.id,
        platform: template.platform,
        format: template.format,
        configuration: storedTemplate?.configuration ?? defaultStyle,
      });
      const print = fingerprint(book.id, input);
      const recent = await db.contentItem.findMany({
        where: { bookId: book.id },
        select: { title: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      if (
        recent.some((c) => similarity(c.title, concept.hook) >= 0.8) &&
        form.get("allowSimilar") !== "yes"
      )
        throw new ActionError(
          "A similar hook was recently used. Change the angle, or explicitly allow similar content.",
        );
      if (await db.contentItem.findUnique({ where: { fingerprint: print } }))
        throw new ActionError(
          "This exact content already exists. Change the angle, assets, or template.",
        );
      const content = await db.contentItem.create({
        data: {
          bookId: book.id,
          platform: template.platform,
          format: template.format,
          title: concept.hook,
          fingerprint: print,
          variants: { create: { data: input } },
          files: {
            create: fileIds.map((fileId) => ({ fileId, role: "SOURCE" })),
          },
        },
      });
      href = `/content/${content.id}`;
      message = "Draft created. Review the concept before rendering.";
    } else if (operation === "render") {
      const settings = await getSettings();
      await queueTransaction(async (tx) => {
        const item = await tx.contentItem.findUnique({
          where: { id: id() },
          include: { variants: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        if (
          !item ||
          !["DRAFT", "READY_FOR_REVIEW", "FAILED", "REJECTED"].includes(
            item.status,
          )
        )
          throw new ActionError(
            "This content cannot be rendered in its current state.",
          );
        if (
          await tx.renderJob.count({
            where: {
              contentId: item.id,
              status: { in: ["PENDING", "PROCESSING"] },
            },
          })
        )
          throw new ActionError("A render is already queued or running.");
        const input = renderInputSchema.parse(item.variants[0]?.data);
        await tx.renderJob.create({
          data: {
            type: input.format === "VIDEO" ? "VIDEO_RENDER" : "IMAGE_RENDER",
            contentId: item.id,
            maxAttempts: settings.renderRetryLimit,
            input,
            files: {
              create: input.fileIds.map((fileId) => ({
                fileId,
                role: "SOURCE",
              })),
            },
          },
        });
        await tx.contentItem.update({
          where: { id: item.id },
          data: { status: "DRAFT" },
        });
      });
      message = "Render queued. The worker will process it in the background.";
    } else if (operation === "save-concept") {
      await queueTransaction(async (tx) => {
        const item = await tx.contentItem.findUnique({
          where: { id: id() },
          include: { variants: { orderBy: { createdAt: "desc" }, take: 1 } },
        });
        if (
          !item ||
          !["DRAFT", "READY_FOR_REVIEW", "REJECTED", "FAILED"].includes(
            item.status,
          )
        )
          throw new ActionError("This content cannot be edited.");
        if (
          await tx.renderJob.count({
            where: {
              contentId: item.id,
              status: { in: ["PENDING", "PROCESSING"] },
            },
          })
        )
          throw new ActionError("Wait for the current render before editing.");
        const input = renderInputSchema.parse(item.variants[0]?.data);
        input.concept = conceptSchema.parse({
          hook: form.get("hook"),
          caption: form.get("caption"),
          cta: form.get("cta"),
          hashtags: String(form.get("hashtags") ?? "")
            .split(/\s+/)
            .filter(Boolean),
          slideTexts: String(form.get("slideTexts") ?? "")
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
          endingQuestion: form.get("endingQuestion"),
        });
        await tx.contentVariant.create({
          data: { contentId: item.id, data: input },
        });
        await tx.fileReference.deleteMany({
          where: { contentId: item.id, role: "OUTPUT" },
        });
        await tx.contentItem.update({
          where: { id: item.id },
          data: {
            title: input.concept.hook,
            fingerprint: fingerprint(item.bookId, input),
            status: "DRAFT",
          },
        });
      });
      message = "Concept saved. Render again to update the creative.";
    } else if (operation === "approve" || operation === "reject") {
      await queueTransaction(async (tx) => {
        const item = await tx.contentItem.findUnique({
          where: { id: id() },
          include: { files: { where: { role: "OUTPUT" } } },
        });
        if (
          !item ||
          !["READY_FOR_REVIEW", "APPROVED", "REJECTED"].includes(item.status) ||
          !item.files.length
        )
          throw new ActionError("Render and review this content first.");
        if (
          await tx.renderJob.count({
            where: {
              contentId: item.id,
              status: { in: ["PENDING", "PROCESSING"] },
            },
          })
        )
          throw new ActionError("Wait for the current render to finish.");
        await tx.contentItem.update({
          where: { id: item.id },
          data: { status: operation === "approve" ? "APPROVED" : "REJECTED" },
        });
      });
      message =
        operation === "approve"
          ? "Content approved. It will not be published automatically."
          : "Content rejected.";
    } else if (operation === "delete-content") {
      await queueTransaction(async (tx) => {
        if (
          (await tx.scheduledPost.count({ where: { contentId: id() } })) ||
          (await tx.renderJob.count({
            where: {
              contentId: id(),
              status: { in: ["PENDING", "PROCESSING"] },
            },
          }))
        )
          throw new ActionError(
            "Content with schedules or active jobs cannot be deleted.",
          );
        await tx.renderJob.deleteMany({ where: { contentId: id() } });
        await tx.contentItem.delete({ where: { id: id() } });
      });
      href = "/content";
      message =
        "Content deleted. Unreferenced generated files can be cleaned in Admin.";
    } else if (operation === "save-template") {
      const template = templateCatalog.find((t) => t.id === id());
      if (!template) throw new ActionError("Unknown template.");
      const configuration = renderInputSchema.shape.configuration.parse({
        background: form.get("background"),
        foreground: form.get("foreground"),
        accent: form.get("accent"),
      });
      await db.creativeTemplate.upsert({
        where: { id: template.id },
        create: {
          id: template.id,
          name: template.name,
          platform: template.platform,
          format: template.format,
          configuration,
        },
        update: { configuration },
      });
    } else throw new ActionError("Unknown content operation.");
    revalidatePath("/", "layout");
    return { ok: true, message, href };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ActionError
          ? error.message
          : error instanceof z.ZodError
            ? error.issues
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(". ")
            : "The operation could not be completed. Check inputs and application health.",
    };
  }
}
