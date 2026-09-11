import { db } from "@/lib/db";
import { requireAdmin } from "@/server/authorization";
import { templateCatalog, defaultStyle } from "@/templates/catalog";
import { renderInputSchema } from "@/lib/content";
import { ContentForm } from "@/components/content-form";
import { Badge } from "@/components/ui";
export default async function Templates() {
  await requireAdmin();
  const saved = await db.creativeTemplate.findMany();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">A CONSISTENT CREATIVE STYLE</div>
          <h1>Templates</h1>
          <p>
            Reusable layouts built from your own book material. Colors are
            configurable per template.
          </p>
        </div>
      </div>
      <div className="template-grid">
        {templateCatalog.map((template) => {
          const parsed = renderInputSchema.shape.configuration.safeParse(
            saved.find((t) => t.id === template.id)?.configuration,
          );
          const style = parsed.success ? parsed.data : defaultStyle;
          return (
            <section className="panel" key={template.id}>
              <Badge>
                {template.platform} · {template.format}
              </Badge>
              <h2 style={{ marginTop: 15 }}>{template.name}</h2>
              <p style={{ margin: "12px 0 20px" }}>{template.description}</p>
              <small>
                {template.platform === "PINTEREST"
                  ? "1000 × 1500"
                  : "1080 × 1920"}
                {template.format === "VIDEO" ? " · 16 seconds · 30 fps" : ""}
              </small>
              <ContentForm
                operation="save-template"
                id={template.id}
                label="Save template colors"
              >
                <div className="color-fields">
                  {(["background", "foreground", "accent"] as const).map(
                    (key) => (
                      <label key={key}>
                        {key}
                        <input
                          type="color"
                          name={key}
                          defaultValue={style[key]}
                        />
                      </label>
                    ),
                  )}
                </div>
              </ContentForm>
            </section>
          );
        })}
      </div>
    </div>
  );
}
