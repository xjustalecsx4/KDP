import Link from "next/link";
export default function Forbidden() {
  return (
    <main className="empty" style={{ minHeight: "100vh" }}>
      <h1>Administrator access required</h1>
      <p>Your account cannot access this private workspace.</p>
      <Link className="button" href="/login">
        Return to sign in
      </Link>
    </main>
  );
}
