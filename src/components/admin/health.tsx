import { getHealth } from "@/services/health";
import { SectionTitle, Status } from "../ui";
export async function HealthSection() {
  const health = await getHealth();
  return (
    <section className="panel">
      <SectionTitle
        title="System health"
        description={`Server-side probes · ${health.checkedAt}`}
      />
      <div className="health-list">
        {[
          [
            "Web application",
            health.web,
            "This web request was served successfully.",
          ],
          ["Database", health.database, "Checks PostgreSQL with SELECT 1."],
          [
            "Worker",
            health.worker,
            "Requires a database heartbeat within 45 seconds.",
          ],
          ["FFmpeg", health.ffmpeg, "Executes the configured FFmpeg binary."],
          [
            "Remotion renderer",
            health.remotion,
            "Launches and closes the renderer browser.",
          ],
          [
            "Storage",
            health.storage,
            "Verifies the storage root permits a temporary write.",
          ],
        ].map(([label, status, description]) => (
          <div className="health-row" key={label}>
            <div>
              <h3>{label}</h3>
              <p>{description}</p>
            </div>
            <Status value={status} />
          </div>
        ))}
      </div>
      <dl className="key-values">
        <div>
          <dt>Application version</dt>
          <dd>{health.version}</dd>
        </div>
        <div>
          <dt>Git commit</dt>
          <dd>{health.commit ?? "Not provided"}</dd>
        </div>
      </dl>
      <div className="panel-note">
        Monitoring endpoint: <code>/api/health</code>. Returns HTTP 503 when a
        required dependency is unhealthy. Detailed results require the
        configured monitoring bearer token.
      </div>
    </section>
  );
}
