"use server";
import { reconcilePinterest } from "@/services/pinterest-publishing";
import { syncPinterest } from "@/services/pinterest";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./authorization";
import {
  mutateJob,
  mutateSchedule,
  clearExpiredFailedJobs,
} from "@/services/jobs";
import { cleanupStorage } from "@/services/storage";
import { disconnectPlatform, providerUnavailable } from "@/services/platforms";
import { db } from "@/lib/db";
import { ActionError, settingsSchema } from "@/lib/policies";
import { audit } from "@/services/events";

export type ActionResult = { ok: boolean; message: string };
export async function adminAction(
  _: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();
  try {
    const area = z
      .enum(["jobs", "scheduler", "platforms", "storage", "settings"])
      .parse(form.get("area"));
    const id = () => z.string().min(1).max(100).parse(form.get("id"));
    const operation = form.get("operation");
    const confirmed = form.get("confirmed") === "yes";
    if (
      [
        "cancel",
        "delete",
        "disconnect",
        "cleanup",
        "clear-failed",
        "reconcile",
      ].includes(String(operation)) &&
      !confirmed
    )
      throw new ActionError("Confirm this action before proceeding.");
    let message = "Changes saved successfully.";
    if (area === "jobs") {
      if (operation === "clear-failed")
        message = `${await clearExpiredFailedJobs(user.id)} expired failed jobs removed.`;
      else {
        await mutateJob(
          id(),
          z.enum(["retry", "cancel", "delete"]).parse(operation),
          user.id,
        );
        message = "Job updated successfully.";
      }
    } else if (area === "scheduler") {
      if (operation === "reconcile") {
        await reconcilePinterest(
          id(),
          z
            .string()
            .regex(/^\d{1,100}$/)
            .parse(form.get("pinId")),
          user.id,
        );
        revalidatePath("/admin");
        return {
          ok: true,
          message:
            "The matching Pinterest Pin was verified. Publication marked complete.",
        };
      }
      const action = z.enum(["retry", "cancel", "reschedule"]).parse(operation);
      const when =
        action === "reschedule"
          ? z.iso
              .datetime({ offset: true })
              .transform((v) => new Date(v))
              .parse(form.get("scheduledAt"))
          : undefined;
      await mutateSchedule(id(), action, user.id, when);
      message = "Schedule updated successfully.";
    } else if (area === "platforms") {
      const platform = z
        .enum(["PINTEREST", "TIKTOK"])
        .parse(form.get("platform"));
      if (operation === "test" && platform === "PINTEREST") {
        await syncPinterest(user.id);
        revalidatePath("/admin/platforms");
        return {
          ok: true,
          message: "Pinterest connection verified and boards synchronized.",
        };
      }
      if (operation !== "disconnect")
        throw new ActionError(providerUnavailable);
      await disconnectPlatform(platform, user.id);
      message = "Platform disconnected. Stored credentials have been removed.";
    } else if (area === "storage") {
      if (operation !== "cleanup")
        throw new ActionError("Invalid storage operation.");
      const result = await cleanupStorage(
        z.enum(["temp", "failed", "unreferenced"]).parse(form.get("kind")),
        user.id,
      );
      message = `${result.removed} files removed. ${result.failed} files could not be removed and can be retried.`;
      revalidatePath("/admin", "layout");
      return { ok: result.failed === 0, message };
    } else {
      const input = Object.fromEntries(
        [...form.entries()].filter(
          ([key]) =>
            !["area", "operation"].includes(key) && !key.startsWith("$ACTION_"),
        ),
      );
      const settings = settingsSchema.parse(input);
      await db.$transaction(async (tx) => {
        await tx.appSetting.upsert({
          where: { key: "operational" },
          create: { key: "operational", value: settings },
          update: { value: settings },
        });
        await audit(tx, "SETTINGS_SAVED", { actorId: user.id });
      });
    }
    revalidatePath("/admin", "layout");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof ActionError)
      return { ok: false, message: error.message };
    if (error instanceof z.ZodError)
      return {
        ok: false,
        message: error.issues
          .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
          .join(". "),
      };
    return {
      ok: false,
      message:
        "The action could not be completed. Check database and storage health, then refresh before retrying.",
    };
  }
}
