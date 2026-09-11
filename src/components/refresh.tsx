"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
export function Refresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="button secondary"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      <RefreshCw size={14} className={pending ? "spin" : ""} />
      {pending ? "Refreshing…" : "Refresh status"}
    </button>
  );
}
