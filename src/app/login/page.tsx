import { LoginForm } from "./form";
import { Leaf } from "lucide-react";
export const dynamic = "force-dynamic";
export default function LoginPage() {
  const configured = Boolean(
    process.env.DATABASE_URL && process.env.AUTH_SECRET,
  );
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={24} />
          </span>
          <span>
            KDP<span className="brand-sub">CONTENT AUTOMATION</span>
          </span>
        </div>
        <h1>
          Your books.
          <br />
          More possibilities.
        </h1>
        <p>
          A private workspace for creating, organizing, and managing your book
          content.
        </p>
      </section>
      <section className="login-box">
        <div>
          <div className="eyebrow">PRIVATE WORKSPACE</div>
          <h2>Welcome back</h2>
          <p>Sign in to manage your content workspace.</p>
          {configured ? (
            <LoginForm />
          ) : (
            <div className="notice">
              <strong>Setup required</strong>
              <p>
                Configure DATABASE_URL and AUTH_SECRET in .env.local, apply
                database migrations, and run the administrator setup command.
                See README.md.
              </p>
            </div>
          )}
          <p className="login-footnote">
            Administrator access only. Public registration is disabled.
          </p>
        </div>
      </section>
    </main>
  );
}
