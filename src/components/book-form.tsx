import type { Book } from "@/generated/prisma/client";
import { ContentForm } from "./content-form";
export function BookForm({ book }: { book?: Book }) {
  return (
    <ContentForm
      operation="save-book"
      id={book?.id}
      label={book ? "Save book" : "Add book"}
    >
      <div className="book-form-grid">
        <label>
          Title
          <input
            name="title"
            defaultValue={book?.title}
            required
            maxLength={200}
          />
        </label>
        <label>
          Subtitle
          <input
            name="subtitle"
            defaultValue={book?.subtitle ?? ""}
            maxLength={300}
          />
        </label>
        <label>
          ASIN
          <input name="asin" defaultValue={book?.asin ?? ""} maxLength={20} />
        </label>
        <label>
          Amazon URL
          <input
            name="amazonUrl"
            type="url"
            defaultValue={book?.amazonUrl ?? ""}
          />
        </label>
        <label>
          Audience
          <input
            name="audience"
            defaultValue={book?.audience ?? "general"}
            required
            placeholder="Children, teens, adults…"
            maxLength={100}
          />
        </label>
        <label>
          Category
          <input
            name="category"
            defaultValue={book?.category ?? ""}
            maxLength={100}
          />
        </label>
        <label>
          Language
          <input
            name="language"
            defaultValue={book?.language ?? "en"}
            required
            maxLength={20}
          />
        </label>
        <label>
          Tone
          <input name="tone" defaultValue={book?.tone ?? ""} maxLength={200} />
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          defaultValue={book?.description ?? ""}
          rows={5}
          maxLength={10000}
        />
      </label>
      <label>
        Themes (comma separated)
        <input name="themes" defaultValue={book?.themes.join(", ")} />
      </label>
      <label>
        Keywords (comma separated)
        <input name="keywords" defaultValue={book?.keywords.join(", ")} />
      </label>
      <label>
        Content angles (comma separated)
        <input
          name="contentAngles"
          defaultValue={book?.contentAngles.join(", ")}
        />
      </label>
    </ContentForm>
  );
}
