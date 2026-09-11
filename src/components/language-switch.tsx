"use client";
// A full navigation refreshes the root HTML language and nonce-bound document.
import { usePathname } from "next/navigation";
import { storePath } from "@/lib/public-routes";
export function LanguageSwitch() {
  const path = usePathname();
  const ro = path === "/ro" || path.startsWith("/ro/");
  return (
    <a
      className="language-toggle"
      href={storePath(path, ro ? "en" : "ro")}
      hrefLang={ro ? "en" : "ro"}
      aria-label={ro ? "Switch to English" : "Switch to Romanian"}
    >
      {ro ? "en / RO" : "EN / ro"}
    </a>
  );
}
