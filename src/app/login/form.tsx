"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await authClient.signIn.email({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      if (response.error)
        setError(
          "Unable to sign in. Check your credentials, or wait a minute before retrying.",
        );
      else router.replace("/admin");
    } catch {
      setError(
        "Authentication is unavailable. Check the application configuration.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <label>
        Email address
        <input type="email" name="email" required autoComplete="username" />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </label>
      <button className="button" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
    </form>
  );
}
