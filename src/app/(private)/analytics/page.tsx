import { requireAdmin } from "@/server/authorization";
import { Empty } from "@/components/ui";
export default async function Analytics() {
  await requireAdmin();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PERFORMANCE</div>
          <h1>Analytics</h1>
          <p>
            Platform metrics and performance insights will be implemented in
            Phase 4.
          </p>
        </div>
      </div>
      <section className="panel">
        <Empty
          title="Analytics will appear after content is published"
          description="No platform analytics are collected in Phase 1. We do not estimate views, clicks, or engagement."
        />
      </section>
    </div>
  );
}
