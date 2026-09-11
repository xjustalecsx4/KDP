"use client";
import { useActionState, useState } from "react";
import { adminAction } from "@/server/actions";
export function ActionForm({
  area,
  operation,
  id,
  platform,
  kind,
  label,
  danger,
  confirmation,
  children,
}: {
  area: string;
  operation: string;
  id?: string;
  platform?: string;
  kind?: string;
  label: string;
  danger?: boolean;
  confirmation?: string;
  children?: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(adminAction, {
    ok: false,
    message: "",
  });
  const [open, setOpen] = useState(false);
  return (
    <div className="action-wrap">
      {confirmation && !open ? (
        <button
          className={danger ? "button danger" : "button secondary"}
          onClick={() => setOpen(true)}
        >
          {label}
        </button>
      ) : (
        <form
          action={action}
          className={confirmation ? "confirmation" : "action-form"}
        >
          <input type="hidden" name="area" value={area} />
          <input type="hidden" name="operation" value={operation} />
          {id && <input type="hidden" name="id" value={id} />}
          {platform && <input type="hidden" name="platform" value={platform} />}
          {kind && <input type="hidden" name="kind" value={kind} />}
          {confirmation && (
            <>
              <p>{confirmation}</p>
              <label className="check">
                <input type="checkbox" name="confirmed" value="yes" required />{" "}
                I understand and confirm this action
              </label>
            </>
          )}
          {children}
          <div className="button-row">
            <button
              disabled={pending}
              className={danger ? "button danger" : "button secondary"}
            >
              {pending ? "Working…" : label}
            </button>
            {confirmation && (
              <button
                type="button"
                className="button ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Keep unchanged
              </button>
            )}
          </div>
        </form>
      )}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={`feedback ${state.ok ? "success" : "error"}`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
