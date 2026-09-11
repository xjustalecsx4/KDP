import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { renderInputSchema } from "@/lib/content";
import { ContentForm } from "@/components/content-form";
import { Empty, SectionTitle, Status, date } from "@/components/ui";
import { Refresh } from "@/components/refresh";
export default async function ContentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const item = await db.contentItem.findUnique({
    where: { id },
    include: {
      book: { select: { title: true } },
      variants: { orderBy: { createdAt: "desc" }, take: 1 },
      files: {
        where: { role: "OUTPUT" },
        include: {
          file: { select: { id: true, mimeType: true, createdAt: true } },
        },
        orderBy: { position: "asc" },
      },
      jobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!item) notFound();
  const input = renderInputSchema.safeParse(item.variants[0]?.data);
  const active = item.jobs.some((j) =>
    ["PENDING", "PROCESSING"].includes(j.status),
  );
  const editable =
    ["DRAFT", "READY_FOR_REVIEW", "REJECTED", "FAILED"].includes(item.status) &&
    !active;
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            {item.platform} · {item.format}
          </div>
          <h1>{item.title}</h1>
          <p>
            {item.book.title} · <Status value={item.status} />
          </p>
        </div>
        <Refresh />
      </div>
      <div className="review-grid">
        <section className="panel">
          <SectionTitle
            title="Creative preview"
            description="Review the rendered output before approval."
          />
          {item.files.length ? (
            <div className="preview-gallery">
                {item.files.map(({ file }, index) => (
                <div key={file.id}>
                  {file.mimeType === "video/mp4" ? (
                    <video
                      controls
                      preload="metadata"
                      src={`/api/files/${file.id}`}
                      aria-label="Rendered book video"
                    />
                  ) : (
                    <Image
                      src={`/api/files/${file.id}`}
                      alt={item.title}
                      width={540}
                      height={960}
                      unoptimized
                    />
                  )}
                  <a
                    className="text-link"
                    href={`/api/files/${file.id}`}
                      download={`${item.platform.toLowerCase()}-${String(index + 1).padStart(2, "0")}.${file.mimeType === "video/mp4" ? "mp4" : "png"}`}
                  >
                    Download {file.mimeType === "video/mp4" ? "video" : "image"}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title={
                active ? "Your creative is being prepared" : "No render yet"
              }
              description={
                active
                  ? "The background worker is processing the render. Refresh to see its progress."
                  : "Review the concept, then submit it to the render worker."
              }
            />
          )}
          <div className="button-row">
            {editable && (
              <ContentForm
                operation="render"
                id={id}
                label={item.files.length ? "Render again" : "Submit render"}
              />
            )}{" "}
            {!active &&
              item.files.length > 0 &&
              ["READY_FOR_REVIEW", "APPROVED", "REJECTED"].includes(
                item.status,
              ) && (
                <>
                  <ContentForm operation="approve" id={id} label="Approve" />
                  <ContentForm operation="reject" id={id} label="Reject" />
                </>
              )}
          </div>
          <div className="notice" style={{ marginTop: 20 }}>
            <p>
              Autopilot is off. Approval does not schedule or publish content.
              You can download approved creatives for manual upload.
            </p>
          </div>
        </section>
        <section className="panel">
          <SectionTitle
            title="Content concept"
            description="Edit the writing before rendering. Changes require a fresh render."
          />
          {input.success ? (
            <ContentForm operation="save-concept" id={id} label="Save concept">
              <fieldset disabled={!editable}>
                <label>
                  Hook / title
                  <input
                    name="hook"
                    defaultValue={input.data.concept.hook}
                    required
                    maxLength={140}
                  />
                </label>
                <label>
                  Caption
                  <textarea
                    name="caption"
                    defaultValue={input.data.concept.caption}
                    rows={6}
                    required
                    maxLength={2200}
                  />
                </label>
                <label>
                  Call to action
                  <input
                    name="cta"
                    defaultValue={input.data.concept.cta}
                    maxLength={100}
                  />
                </label>
                <label>
                  Hashtags (space separated)
                  <input
                    name="hashtags"
                    defaultValue={input.data.concept.hashtags.join(" ")}
                  />
                </label>
                <label>
                  Slide text (one per line)
                  <textarea
                    name="slideTexts"
                    defaultValue={input.data.concept.slideTexts.join("\n")}
                    rows={6}
                  />
                </label>
                <label>
                  Ending question
                  <input
                    name="endingQuestion"
                    defaultValue={input.data.concept.endingQuestion}
                    maxLength={140}
                  />
                </label>
              </fieldset>
            </ContentForm>
          ) : (
            <Empty
              title="Concept unavailable"
              description="This record has no valid structured concept."
            />
          )}
        </section>
      </div>
      <section className="panel">
        <SectionTitle title="Render history" />
        {item.jobs.map((job) => (
          <Link
            className="event-row"
            key={job.id}
            href={`/admin/jobs/${job.id}`}
          >
            <Status value={job.status} />
            <span>
              {job.type} · {job.attemptCount} / {job.maxAttempts} attempts
            </span>
            <time>{date(job.createdAt)}</time>
          </Link>
        ))}
        <div className="button-row" style={{ marginTop: 20 }}>
          <Link
            className="button secondary"
            href={`/create?book=${item.bookId}`}
          >
            Generate another concept
          </Link>
          <ContentForm
            operation="delete-content"
            id={id}
            label="Delete content"
            confirmation="Delete this content and its completed or failed job records? Active jobs and scheduled posts prevent deletion."
          />
        </div>
      </section>
    </div>
  );
}
