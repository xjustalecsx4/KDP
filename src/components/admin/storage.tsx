import { db } from "@/lib/db";
import { storageUsage } from "@/services/storage";
import { getSettings } from "@/services/settings";
import { SectionTitle, bytes } from "../ui";
import { ActionForm } from "../action-form";
export async function StorageSection() {
  const [usage, settings, tracked] = await Promise.all([
    storageUsage().catch(() => null),
    getSettings(),
    db.storedFile.aggregate({ _sum: { bytes: true }, _count: true }),
  ]);
  return (
    <>
      <SectionTitle
        title="Storage management"
        description="Private files, measured usage, and reference-aware cleanup."
      />
      <div className="metric-grid">
        {[
          ["Total storage", usage?.total],
          ["Book files", usage?.books],
          ["Generated images", usage?.generated],
          ["Video renders", usage?.renders],
          ["Temporary files", usage?.temp],
          ["Other files", usage?.other],
        ].map(([label, size]) => (
          <div className="metric-card" key={label}>
            <div className="metric-label">{label}</div>
            <div className="storage-number">
              {bytes(size as number | undefined)}
            </div>
          </div>
        ))}
      </div>
      <p className="subtle">
        {tracked._count} tracked files ·{" "}
        {bytes(Number(tracked._sum.bytes ?? 0))} recorded in the database. Disk
        measurements can include untracked files.
      </p>
      <section className="panel">
        <SectionTitle
          title="Safe cleanup"
          description={`Only tracked files older than ${settings.temporaryRetentionHours} hours, with no database references, are eligible.`}
        />
        {[
          ["temp", "Temporary files", "Remove expired temporary files."],
          [
            "failed",
            "Failed renders",
            "Remove unreferenced output from failed renders.",
          ],
          [
            "unreferenced",
            "Old generated files",
            "Remove older generated images and videos that are no longer in use.",
          ],
        ].map(([kind, title, description]) => (
          <div className="cleanup-row" key={kind}>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            <ActionForm
              area="storage"
              operation="cleanup"
              kind={kind}
              label="Clean up"
              danger
              confirmation={`Permanently delete eligible ${title.toLowerCase()}? This cannot be undone. Up to 250 files will be processed per run.`}
            />
          </div>
        ))}
        <div className="panel-note">
          Book originals are excluded from cleanup. References from assets,
          content, jobs, and scheduled posts prevent deletion. Untracked files
          require manual review.
        </div>
      </section>
    </>
  );
}
