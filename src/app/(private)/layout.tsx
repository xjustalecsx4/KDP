import { requireAdmin } from "@/server/authorization";
import { Navigation } from "@/components/navigation";
import { Feedback } from "@/components/feedback";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();
  return (
    <div className="app-shell">
      <Navigation name={user.name} />
      <Feedback />
      <main className="main">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span> Management
          </span>
          <span className="topbar-note">
            <span className="privacy-dot" />
            Private application
          </span>
        </header>
        {children}
      </main>
    </div>
  );
}
