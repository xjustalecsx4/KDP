import { requireAdmin } from "@/server/authorization";
import { BookForm } from "@/components/book-form";
export default async function NewBook() {
  await requireAdmin();
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR CATALOG</div>
          <h1>Add a book</h1>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 850 }}>
        <BookForm />
      </section>
    </div>
  );
}
