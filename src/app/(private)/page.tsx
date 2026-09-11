import Link from "next/link";
import { Empty } from "@/components/ui";
export default function Dashboard() {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>Dashboard</h1>
          <p>
            The administration foundation is ready. Content workflows are the
            next implementation milestone.
          </p>
        </div>
      </div>
      <section className="panel">
        <Empty
          title="Your content workspace starts here"
          description="Books, creative generation, and review workflows are not yet implemented in this administration milestone."
        />
        <div className="button-row">
          <Link href="/admin" className="button">
            Open administration
          </Link>
          <Link href="/admin/health" className="button secondary">
            Check system health
          </Link>
        </div>
      </section>
    </div>
  );
}
