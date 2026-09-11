"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Layers,
  CalendarDays,
  PanelTop,
  ChartNoAxesCombined,
  ShieldCheck,
  Settings,
  ChevronRight,
  Leaf,
} from "lucide-react";
const links = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Books", "/books", BookOpen],
  ["Create Content", "/create", Sparkles],
  ["Content Queue", "/content", Layers],
  ["Calendar", "/calendar", CalendarDays],
  ["Templates", "/templates", PanelTop],
  ["Analytics", "/analytics", ChartNoAxesCombined],
  ["Admin", "/admin", ShieldCheck],
  ["Settings", "/settings", Settings],
] as const;
export function Navigation({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark">
          <Leaf size={24} />
        </span>
        <span>
          KDP<span className="brand-sub">CONTENT AUTOMATION</span>
        </span>
      </Link>
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">
        {links.map(([label, href, Icon]) => (
          <Link
            key={href}
            href={href}
            className={`nav-link ${(pathname === href || pathname.startsWith(href + "/")) ? "active" : ""}`}
          >
            <Icon size={18} strokeWidth={1.7} />
            {label}
            {href === "/admin" && <span className="nav-dot" />}
          </Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="private-note">
          <ShieldCheck size={17} />
          <div>
            Private workspace<small>Administrator access only</small>
          </div>
        </div>
        <Link href="/admin/account" className="account-link">
          <span className="avatar">{name.charAt(0).toUpperCase()}</span>
          <span>
            {name}
            <small>Administrator</small>
          </span>
          <ChevronRight size={15} />
        </Link>
      </div>
    </aside>
  );
}
export const adminLinks = [
  ["Overview", "/admin"],
  ["Jobs", "/admin/jobs"],
  ["Scheduler", "/admin/scheduler"],
  ["Platforms", "/admin/platforms"],
  ["Storage", "/admin/storage"],
  ["System logs", "/admin/logs"],
  ["Health", "/admin/health"],
  ["Configuration", "/admin/settings"],
  ["Account", "/admin/account"],
];
export function AdminNavigation() {
  const pathname = usePathname();
  return (
    <nav className="tabs" aria-label="Administration">
      {adminLinks.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className={
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(href + "/"))
              ? "selected"
              : ""
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
