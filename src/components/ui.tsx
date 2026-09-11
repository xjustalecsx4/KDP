import { Inbox, CircleAlert } from "lucide-react";
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "warning" | "bad" | "neutral";
}) {
  return (
    <span className={`badge ${tone}`}>
      <span />
      {children}
    </span>
  );
}
export function Status({ value }: { value: string }) {
  const upper = value.toUpperCase();
  return (
    <Badge
      tone={
        [
          "HEALTHY",
          "AVAILABLE",
          "COMPLETED",
          "PUBLISHED",
          "CONNECTED",
        ].includes(upper)
          ? "good"
          : ["FAILED", "ERROR", "MISSING"].includes(upper)
            ? "bad"
            : ["PENDING", "PROCESSING", "OFFLINE", "SCHEDULED"].includes(upper)
              ? "warning"
              : "neutral"
      }
    >
      {value.replaceAll("_", " ").toLowerCase()}
    </Badge>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={25} strokeWidth={1.3} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Unavailable({
  label = "Data unavailable",
}: {
  label?: string;
}) {
  return (
    <div className="notice error">
      <CircleAlert size={18} />
      <div>
        <strong>{label}</strong>
        <p>
          Check the database connection and apply migrations. No values are
          estimated.
        </p>
      </div>
    </div>
  );
}
export function SectionTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function date(value: Date | null | undefined) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(value) + " UTC"
    : "—";
}
export function bytes(value: number | undefined) {
  if (value === undefined) return "Unavailable";
  if (value < 1024) return `${value} B`;
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return `${(value / 1024 ** index).toFixed(1)} ${["B", "KB", "MB", "GB", "TB"][index]}`;
}
