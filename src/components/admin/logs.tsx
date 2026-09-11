import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { safeEventMessage } from "@/services/events";
import { SectionTitle, Empty, Badge, date } from "../ui";
import { text, pageNumber, pageSize, Pagination, type Query } from "./shared";
export async function LogsSection({ query }: { query: Query }) {
  const level = (["INFO", "WARNING", "ERROR"] as const).find(
    (v) => v === text(query, "level"),
  );
  const platform = (["PINTEREST", "TIKTOK"] as const).find(
    (v) => v === text(query, "platform"),
  );
  const source = [
    "admin",
    "worker",
    "auth",
    "app",
    "scheduler",
    "platform",
  ].find((v) => v === text(query, "source"));
  const day = text(query, "date");
  const start = /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? new Date(`${day}T00:00:00Z`)
    : null;
  const where: Prisma.SystemEventWhereInput = {
    level,
    platform,
    source,
    jobId: text(query, "job").slice(0, 100) || undefined,
    ...(start && !isNaN(start.getTime())
      ? { createdAt: { gte: start, lt: new Date(start.getTime() + 86400000) } }
      : {}),
  };
  const page = pageNumber(query);
  const logs = await db.systemEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize + 1,
    skip: (page - 1) * pageSize,
  });
  return (
    <section className="panel">
      <SectionTitle
        title="System logs"
        description="Structured application, authentication, and worker events."
      />
      <form className="filters">
        <label>
          Level
          <select name="level" defaultValue={level ?? ""}>
            <option value="">All levels</option>
            {["INFO", "WARNING", "ERROR"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select name="source" defaultValue={source ?? ""}>
            <option value="">All sources</option>
            {["admin", "worker", "auth", "app", "scheduler", "platform"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Date (UTC)
          <input type="date" name="date" defaultValue={day} />
        </label>
        <label>
          Job ID
          <input name="job" defaultValue={text(query, "job")} maxLength={100} />
        </label>
        <label>
          Platform
          <select name="platform" defaultValue={platform ?? ""}>
            <option value="">All platforms</option>
            <option>PINTEREST</option>
            <option>TIKTOK</option>
          </select>
        </label>
        <button className="button secondary">Filter logs</button>
        <Link href="/admin/logs">Reset</Link>
      </form>
      {logs.length === 0 ? (
        <Empty
          title="No matching events"
          description="Adjust your filters or return after the application records activity."
        />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {["Time", "Level", "Source", "Event", "Job", "Platform"].map(
                  (v) => (
                    <th key={v}>{v}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, pageSize).map((log) => (
                <tr key={log.id}>
                  <td>{date(log.createdAt)}</td>
                  <td>
                    <Badge
                      tone={
                        log.level === "ERROR"
                          ? "bad"
                          : log.level === "WARNING"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {log.level}
                    </Badge>
                  </td>
                  <td>
                    {[
                      "admin",
                      "worker",
                      "auth",
                      "app",
                      "scheduler",
                      "platform",
                    ].includes(log.source)
                      ? log.source
                      : "system"}
                  </td>
                  <td>{safeEventMessage(log.message)}</td>
                  <td>
                    {log.jobId ? (
                      <Link href={`/admin/jobs/${log.jobId}`}>View job</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{log.platform ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        base="/admin/logs"
        page={page}
        more={logs.length > pageSize}
        query={query}
      />
      <div className="panel-note">
        Unstructured log messages are withheld. Passwords, credentials, headers,
        and environment values are never displayed.
      </div>
    </section>
  );
}
