import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/authorization";
import {
  JobsSection,
  SchedulerSection,
  PlatformsSection,
  StorageSection,
  LogsSection,
  HealthSection,
  SettingsSection,
  AccountSection,
  type Query,
} from "@/components/admin-sections";
export default async function AdminSection({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Query>;
}) {
  await requireAdmin();
  const { section } = await params;
  const query = await searchParams;
  switch (section) {
    case "jobs":
      return <JobsSection query={query} />;
    case "scheduler":
      return <SchedulerSection query={query} />;
    case "platforms":
      return <PlatformsSection />;
    case "storage":
      return <StorageSection />;
    case "logs":
      return <LogsSection query={query} />;
    case "health":
      return <HealthSection />;
    case "settings":
      return <SettingsSection />;
    case "account":
      return <AccountSection />;
    default:
      notFound();
  }
}
