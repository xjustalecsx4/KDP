import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty } from "@/components/ui";
const names: Record<string, string> = {
  books: "Books",
  create: "Create Content",
  content: "Content Queue",
  calendar: "Calendar",
  templates: "Templates",
  analytics: "Analytics",
  settings: "Settings",
};
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const name = names[workspace];
  if (!name) notFound();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTENT WORKSPACE</div>
          <h1>{name}</h1>
        </div>
      </div>
      <section className="panel">
        <Empty
          title={`${name} is not implemented yet`}
          description="This milestone establishes private administration. The content workflow will be built incrementally as specified in Phase 1."
        />
        <Link
          className="button secondary"
          href={workspace === "settings" ? "/admin/settings" : "/admin"}
        >
          {workspace === "settings"
            ? "Operational configuration"
            : "Open administration"}
        </Link>
      </section>
    </div>
  );
}
