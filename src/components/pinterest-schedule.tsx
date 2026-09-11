"use client";
import { useActionState } from "react";
import { schedulePinterestAction } from "@/server/pinterest-actions";
export function PinterestSchedule({
  id,
  boards,
  enabled,
}: {
  id: string;
  boards: { id: string; name: string }[];
  enabled: boolean;
}) {
  const [result, action, pending] = useActionState(schedulePinterestAction, {
    ok: false,
    message: "",
  });
  return (
    <section className="panel">
      <h2>Schedule approved image on Pinterest</h2>
      <p>
        Publishing requires app approval, a connected account and server
        activation. Trial Pins are only visible to their creator. The title is
        limited to 100 characters and the description to 800.
      </p>
      <form action={action} className="form-grid">
        <input type="hidden" name="id" value={id} />
        <label>
          Board
          <select name="boardId" required disabled={!enabled}>
            <option value="">Select a synchronized board</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Publish time (ISO 8601 with timezone offset)
          <input
            name="scheduledAt"
            placeholder="2026-10-01T10:00:00+03:00"
            required
            disabled={!enabled}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="confirmed"
            value="yes"
            required
            disabled={!enabled}
          />{" "}
          I approve publishing this image at the selected time.
        </label>
        <button
          className="button"
          disabled={!enabled || pending || !boards.length}
        >
          {pending ? "Scheduling…" : "Schedule on Pinterest"}
        </button>
        {result.message && (
          <p role={result.ok ? "status" : "alert"}>{result.message}</p>
        )}
      </form>
    </section>
  );
}
