import { notFound, permanentRedirect } from "next/navigation";
import { findArticleKey, storePath } from "@/lib/public-routes";
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!findArticleKey(slug)) notFound();
  permanentRedirect(storePath("/blog/" + slug, "en"));
}
