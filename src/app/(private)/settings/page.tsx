import Link from "next/link";
import { requireAdmin } from "@/server/authorization";
import { Badge } from "@/components/ui";
export default async function Settings() {
  await requireAdmin();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE PREFERENCES</div>
          <h1>Settings</h1>
          <p>
            Content generation and approval preferences. Operational controls
            live in Admin.
          </p>
        </div>
      </div>
      <section className="panel">
        <h2>Content generation</h2>
        <dl className="key-values">
          <div>
            <dt>Provider</dt>
            <dd>
              {process.env.AI_PROVIDER === "template"
                ? "Offline templates"
                : process.env.AI_PROVIDER === "openai-compatible"
                  ? "Configured AI endpoint"
                  : "Not configured"}
            </dd>
          </div>
          <div>
            <dt>AI credentials</dt>
            <dd>
              {process.env.AI_API_KEY
                ? "Configured on server"
                : "Not configured"}
            </dd>
          </div>
          <div>
            <dt>Approval mode</dt>
            <dd>
              <Badge>Manual review required</Badge>
            </dd>
          </div>
          <div>
            <dt>Autopilot</dt>
            <dd>Off</dd>
          </div>
          <div>
            <dt>Optional audio</dt>
            <dd>Not enabled in this version</dd>
          </div>
        </dl>
        <div className="notice">
          <p>
            Set AI_PROVIDER, AI_BASE_URL, AI_API_KEY and AI_MODEL in the server
            environment. Use AI_PROVIDER=template for offline writing templates.
            Secret values are never displayed here.
          </p>
        </div>
        <div className="button-row">
          <Link className="button secondary" href="/admin/settings">
            Operational settings
          </Link>
          <Link className="button secondary" href="/admin/account">
            Account security
          </Link>
          <Link className="button secondary" href="/admin/platforms">
            Platform connections
          </Link>
        </div>
      </section>
    </div>
  );
}
