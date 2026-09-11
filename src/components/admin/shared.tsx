import Link from "next/link";
export type Query = Record<string, string | string[] | undefined>;
export const text = (q: Query, key: string) =>
  typeof q[key] === "string" ? (q[key] as string) : "";
export const pageNumber = (q: Query) =>
  Math.max(1, Math.min(10000, Number.parseInt(text(q, "page")) || 1));
export const pageSize = 30;
export function Pagination({
  base,
  page,
  more,
  query,
}: {
  base: string;
  page: number;
  more: boolean;
  query: Query;
}) {
  const url = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query))
      if (typeof v === "string") params.set(k, v);
    params.set("page", String(p));
    return `${base}?${params}`;
  };
  return (
    <div className="pagination">
      {page > 1 && <Link href={url(page - 1)}>← Previous</Link>}
      <span>Page {page}</span>
      {more && <Link href={url(page + 1)}>Next →</Link>}
    </div>
  );
}
