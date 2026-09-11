import { getPlatforms, providerUnavailable } from "@/services/platforms";
import { SectionTitle, Status, date } from "../ui";
import { ActionForm } from "../action-form";
export async function PlatformsSection() {
  const platforms = await getPlatforms();
  return (
    <>
      <SectionTitle
        title="Platform connections"
        description="Manage the accounts used for official API publishing."
      />
      <div className="platform-grid">
        {platforms.map(({ platform, account }) => (
          <section className="panel platform-card" key={platform}>
            <div className="platform-heading">
              <div className={`platform-logo ${platform.toLowerCase()}`}>
                {platform === "PINTEREST" ? "P" : "♪"}
              </div>
              <div>
                <h2>{platform === "PINTEREST" ? "Pinterest" : "TikTok"}</h2>
                <Status
                  value={account?.connected ? "Connected" : "Disconnected"}
                />
              </div>
            </div>
            <dl className="key-values">
              <div>
                <dt>Account</dt>
                <dd>{account?.displayName ?? "Not available"}</dd>
              </div>
              <div>
                <dt>Account ID</dt>
                <dd>{account?.externalAccountId ?? "—"}</dd>
              </div>
              <div>
                <dt>Token status</dt>
                <dd>
                  {!account?.connected
                    ? "Not connected"
                    : !account.tokenExpiresAt
                      ? "Expiry unknown"
                      : account.tokenExpiresAt < new Date()
                        ? "Expired"
                        : "Within expiry; not tested"}
                </dd>
              </div>
              <div>
                <dt>Last successful API request</dt>
                <dd>{date(account?.lastSuccessfulRequestAt)}</dd>
              </div>
              <div>
                <dt>Last synchronization</dt>
                <dd>{date(account?.lastSyncAt)}</dd>
              </div>
              <div>
                <dt>Last error</dt>
                <dd>
                  {account?.hasError
                    ? "A platform error was recorded. Reconnect when the provider is available."
                    : "None recorded"}
                </dd>
              </div>
            </dl>
            <div className="notice">
              <p>{providerUnavailable}</p>
            </div>
            <div className="button-row">
              <ActionForm
                area="platforms"
                operation={account?.connected ? "reconnect" : "connect"}
                platform={platform}
                label={account?.connected ? "Reconnect" : "Connect"}
              />
              <ActionForm
                area="platforms"
                operation="test"
                platform={platform}
                label="Test connection"
              />
              {account?.connected && (
                <ActionForm
                  area="platforms"
                  operation="disconnect"
                  platform={platform}
                  label="Disconnect"
                  danger
                  confirmation="Disconnect this account and remove its stored credentials? Pending schedules must be cancelled first."
                />
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
