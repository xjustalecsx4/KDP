"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./authorization";
import { schedulePinterest } from "@/services/pinterest-publishing";
import { ActionError } from "@/lib/policies";
export async function schedulePinterestAction(
  _: { ok: boolean; message: string },
  form: FormData,
) {
  const { user } = await requireAdmin();
  try {
    if (form.get("confirmed") !== "yes")
      throw new ActionError("Confirm scheduling this approved image.");
    const input = z
      .object({
        id: z.string().min(1).max(100),
        boardId: z.string().regex(/^\d+$/),
        scheduledAt: z.iso.datetime({ offset: true }),
      })
      .parse(
        Object.fromEntries(
          ["id", "boardId", "scheduledAt"].map((k) => [k, form.get(k)]),
        ),
      );
    await schedulePinterest(
      input.id,
      input.boardId,
      new Date(input.scheduledAt),
      user.id,
    );
    revalidatePath("/admin");
    revalidatePath("/content/" + input.id);
    revalidatePath("/calendar");
    return {
      ok: true,
      message: "Pinterest post scheduled. Manage it in Admin → Scheduler.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ActionError
          ? error.message
          : "Scheduling failed. Verify the board, Amazon link and date with timezone offset.",
    };
  }
}
