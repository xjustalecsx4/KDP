"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty">
      <h2>Administration data is unavailable</h2>
      <p>Check the database connection and migrations, then try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
