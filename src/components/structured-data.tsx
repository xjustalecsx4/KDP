import { headers } from "next/headers";
import { safeJsonLd } from "@/lib/seo";
export async function StructuredData({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      nonce={(await headers()).get("x-nonce") ?? undefined}
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
