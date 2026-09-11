import { getSettings } from "@/services/settings";
import { SectionTitle } from "../ui";
import { ActionForm } from "../action-form";
export async function SettingsSection() {
  const s = await getSettings();
  return (
    <section className="panel">
      <SectionTitle
        title="Operational configuration"
        description="Validated settings shared by the web application and worker."
      />
      <div className="settings-container">
        <ActionForm area="settings" operation="save" label="Save settings">
          <div className="settings-form">
            {[
              [
                "workerPollingSeconds",
                "Worker polling interval (seconds)",
                s.workerPollingSeconds,
                2,
                300,
              ],
              [
                "renderRetryLimit",
                "Render maximum attempts",
                s.renderRetryLimit,
                1,
                10,
              ],
              [
                "publishRetryLimit",
                "Publish maximum attempts",
                s.publishRetryLimit,
                1,
                5,
              ],
              [
                "temporaryRetentionHours",
                "Temporary / unreferenced file retention (hours)",
                s.temporaryRetentionHours,
                1,
                2160,
              ],
              [
                "failedJobRetentionDays",
                "Failed job retention (days)",
                s.failedJobRetentionDays,
                1,
                365,
              ],
            ].map(([name, label, value, min, max]) => (
              <label key={name}>
                {label}
                <input
                  name={String(name)}
                  type="number"
                  defaultValue={value}
                  min={Number(min)}
                  max={Number(max)}
                  required
                />
              </label>
            ))}
            <label>
              Default timezone
              <input name="timezone" defaultValue={s.timezone} required />
              <small>IANA timezone, for example Europe/Bucharest.</small>
            </label>
            <label>
              Overdue scheduling behavior
              <select
                name="schedulingBehavior"
                defaultValue={s.schedulingBehavior}
              >
                <option value="HOLD_OVERDUE">
                  Hold overdue posts for review
                </option>
                <option value="PUBLISH_WHEN_AVAILABLE">
                  Publish when a worker becomes available
                </option>
              </select>
            </label>
          </div>
        </ActionForm>
      </div>
      <div className="panel-note">
        Retry limits include the first attempt and apply to newly created jobs.
        The worker rereads settings each polling cycle. Publishing policy takes
        effect only after a provider is implemented. Autopilot remains off.
      </div>
    </section>
  );
}
