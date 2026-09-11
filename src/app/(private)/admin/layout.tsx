import { AdminNavigation } from "@/components/navigation";
import { Refresh } from "@/components/refresh";
import { ShieldCheck } from "lucide-react";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={13} /> SYSTEM MANAGEMENT
          </div>
          <h1>Administration</h1>
          <p>Keep your workspace connected, healthy, and running smoothly.</p>
        </div>
        <Refresh />
      </div>
      <AdminNavigation />
      {children}
      <footer className="page-footer">
        <span>KDP Content Automation</span>
        <span>Private administration · All timestamps shown in UTC</span>
      </footer>
    </div>
  );
}
