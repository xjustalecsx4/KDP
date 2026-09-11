"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  contentAction,
  type ContentActionResult,
} from "@/server/content-actions";
import { showFeedback } from "./feedback";
export function ContentForm({
  operation,
  id,
  label,
  children,
  confirmation,
}: {
  operation: string;
  id?: string;
  label: string;
  children?: React.ReactNode;
  confirmation?: string;
}) {
  const router = useRouter();
  const [, action, pending] = useActionState(
    async (previous: ContentActionResult, data: FormData) => {
      showFeedback(null);
      const result = await contentAction(previous, data);
      showFeedback(result);
      if (result.ok && result.href) router.push(result.href);
      return result;
    },
    {
      ok: false,
      message: "",
    } as ContentActionResult,
  );
  const [open, setOpen] = useState(false);
  return (
    <div className="content-form-wrap">
      {confirmation && !open ? (
        <button className="button danger" onClick={() => setOpen(true)}>
          {label}
        </button>
      ) : (
        <form
          action={action}
          className={confirmation ? "confirmation" : "content-form"}
        >
          <input type="hidden" name="operation" value={operation} />
          {id && <input type="hidden" name="id" value={id} />}{" "}
          {confirmation && (
            <>
              <p>{confirmation}</p>
              <label className="check">
                <input type="checkbox" name="confirmed" value="yes" required />I
                understand and confirm this action
              </label>
            </>
          )}
          {children}
          <div className="button-row">
            <button
              disabled={pending}
              className={confirmation ? "button danger" : "button"}
            >
              {pending ? "Working…" : label}
            </button>
            {confirmation && (
              <button
                className="button ghost"
                type="button"
                onClick={() => setOpen(false)}
              >
                Keep unchanged
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
