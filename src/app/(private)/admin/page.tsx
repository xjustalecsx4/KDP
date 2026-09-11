import Link from "next/link";
import { requireAdmin } from "@/server/authorization";
import {
  ArrowUpRight,
  Activity,
  Database,
  Cpu,
  HardDrive,
  BookOpen,
  ImageIcon,
  Film,
  Clock3,
  CircleAlert,
  ListChecks,
} from "lucide-react";
import { db } from "@/lib/db";
import { workerIsActive } from "@/lib/policies";
import { storageUsage } from "@/services/storage";
import { safeEventMessage, safeEventSource } from "@/services/events";
import {
  Badge,
  Status,
  SectionTitle,
  Empty,
  Unavailable,
  date,
  bytes,
} from "@/components/ui";
export default async function AdminOverview() {
  await requireAdmin();
  const [dataResult, diskResult] = await Promise.allSettled([
    db.$transaction(async (tx) => {
      const [
        jobs,
        posts,
        failedAttempts,
        books,
        images,
        videos,
        worker,
        events,
      ] = await Promise.all([
        tx.renderJob.groupBy({ by: ["status"], _count: true }),
        tx.scheduledPost.count({ where: { status: "SCHEDULED" } }),
        tx.publishAttempt.count({ where: { status: "FAILED" } }),
        tx.book.count(),
        tx.storedFile.count({ where: { category: "IMAGE", state: "ACTIVE" } }),
        tx.storedFile.count({ where: { category: "VIDEO", state: "ACTIVE" } }),
        tx.workerHeartbeat.findFirst({ orderBy: { lastSeenAt: "desc" } }),
        tx.systemEvent.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
      ]);
      return {
        jobs,
        posts,
        failedAttempts,
        books,
        images,
        videos,
        worker,
        events,
      };
    }),
    storageUsage(),
  ]);
  const data = dataResult.status === "fulfilled" ? dataResult.value : null;
  const disk = diskResult.status === "fulfilled" ? diskResult.value : null;
  const active = workerIsActive(data?.worker?.lastSeenAt);
  const count = (status: string) =>
    data ? (data.jobs.find((j) => j.status === status)?._count ?? 0) : null;
  const metrics = [
    {
      label: "Queued jobs",
      value: count("PENDING"),
      icon: ListChecks,
      note: "Waiting for a worker",
      link: "/admin/jobs?status=PENDING",
    },
    {
      label: "Running jobs",
      value: count("PROCESSING"),
      icon: Activity,
      note: "Currently processing",
      link: "/admin/jobs?status=PROCESSING",
    },
    {
      label: "Failed jobs",
      value: count("FAILED"),
      icon: CircleAlert,
      note: "May need your attention",
      link: "/admin/jobs?status=FAILED",
    },
    {
      label: "Scheduled posts",
      value: data?.posts,
      icon: Clock3,
      note: "In the publishing schedule",
      link: "/admin/scheduler",
    },
  ];
  return (
    <>
      <div className="section-heading overview-title">
        <div>
          <h2>System overview</h2>
          <p>A live snapshot of your application.</p>
        </div>
        <span className="subtle">Updated {date(new Date())}</span>
      </div>
      {!data && <Unavailable />}
      <div className="status-strip">
        <div>
          <span className="status-icon">
            <Activity size={18} />
          </span>
          <span>
            Application
            <Status value="Healthy" />
          </span>
        </div>
        <div>
          <span className="status-icon">
            <Database size={18} />
          </span>
          <span>
            Database
            <Status value={data ? "Healthy" : "Error"} />
          </span>
        </div>
        <div>
          <span className="status-icon">
            <Cpu size={18} />
          </span>
          <span>
            Worker
            <Status value={active ? "Healthy" : "Offline"} />
          </span>
        </div>
        <Link href="/admin/health">
          View system health <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="metric-grid">
        {metrics.map(({ label, value, icon: Icon, note, link }) => (
          <Link href={link} className="metric-card" key={label}>
            <div className="metric-label">
              {label}
              <Icon size={17} />
            </div>
            <div className="metric-value">{value ?? "—"}</div>
            <div className="metric-note">
              {note}
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <SectionTitle
            title="Background services"
            description="Worker activity and publishing readiness"
          >
            <Link className="text-link" href="/admin/jobs">
              Manage jobs <ArrowUpRight size={14} />
            </Link>
          </SectionTitle>
          <div className="service-row">
            <span className="service-symbol">
              <Cpu size={22} />
            </span>
            <div>
              <strong>Job worker</strong>
              <p>PostgreSQL-backed processing</p>
            </div>
            <Badge tone={active ? "good" : "warning"}>
              {active ? "Active" : "Offline"}
            </Badge>
          </div>
          <dl className="key-values">
            <div>
              <dt>Last heartbeat</dt>
              <dd>{date(data?.worker?.lastSeenAt)}</dd>
            </div>
            <div>
              <dt>Last worker activity</dt>
              <dd>{date(data?.worker?.lastActivityAt)}</dd>
            </div>
            <div>
              <dt>Scheduler worker</dt>
              <dd>
                <Badge tone="neutral">
                  {active && data?.worker?.schedulerEnabled
                    ? "Active"
                    : "Inactive"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Failed publishing attempts</dt>
              <dd>{data?.failedAttempts ?? "Unavailable"}</dd>
            </div>
          </dl>
          <div className="panel-note">
            Publishing integrations are pending. Scheduled content will not be
            sent to a platform.
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            title="Workspace storage"
            description="Measured from the private storage directory"
          >
            <HardDrive size={18} />
          </SectionTitle>
          <div className="storage-total">
            {disk ? bytes(disk.total) : "Unavailable"}
            <span>Total disk usage</span>
          </div>
          <div className="storage-bar">
            {disk &&
              disk.total > 0 &&
              ["books", "generated", "renders", "temp", "other"].map(
                (key, index) => (
                  <span
                    key={key}
                    style={{
                      width: `${(disk[key] / disk.total) * 100}%`,
                      background: [
                        "#327766",
                        "#81aa9b",
                        "#b5cec1",
                        "#e2b86f",
                        "#a3a9b0",
                      ][index],
                    }}
                  />
                ),
              )}
          </div>
          <div className="storage-legend">
            {[
              ["books", "Books"],
              ["generated", "Images"],
              ["renders", "Videos"],
              ["temp", "Temporary"],
            ].map(([key, label]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{bytes(disk?.[key])}</strong>
              </div>
            ))}
          </div>
          <Link className="panel-bottom-link" href="/admin/storage">
            Manage storage <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <div className="inventory-grid">
        {[
          ["Books", data?.books, BookOpen],
          ["Generated images", data?.images, ImageIcon],
          ["Generated videos", data?.videos, Film],
        ].map(([label, value, Icon]) => {
          const Glyph = Icon as typeof BookOpen;
          return (
            <div className="inventory-card" key={String(label)}>
              <Glyph size={21} />
              <span>{label as string}</span>
              <strong>{(value as number) ?? "—"}</strong>
            </div>
          );
        })}
      </div>
      <section className="panel">
        <SectionTitle
          title="Recent system activity"
          description="Application and worker events"
        >
          <Link className="text-link" href="/admin/logs">
            View all logs <ArrowUpRight size={14} />
          </Link>
        </SectionTitle>
        {!data ? (
          <Unavailable label="Activity unavailable" />
        ) : data.events.length === 0 ? (
          <Empty
            title="No system activity yet"
            description="Worker events and administrative actions will appear here."
          />
        ) : (
          <div className="event-list">
            {data.events.map((event) => (
              <div className="event-row" key={event.id}>
                <Badge
                  tone={
                    event.level === "ERROR"
                      ? "bad"
                      : event.level === "WARNING"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {event.level}
                </Badge>
                <span>
                  {safeEventMessage(event.message)}
                  <small>{safeEventSource(event.source)}</small>
                </span>
                <time>{date(event.createdAt)}</time>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
