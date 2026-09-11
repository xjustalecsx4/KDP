"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function AccountControls() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      if (data.get("newPassword") !== data.get("confirmPassword")) {
        setMessage("New passwords must match.");
        return;
      }
      const result = await authClient.changePassword({
        currentPassword: String(data.get("currentPassword")),
        newPassword: String(data.get("newPassword")),
        revokeOtherSessions: true,
      });
      setMessage(
        result.error
          ? "Password could not be changed. Check your current password and try again."
          : "Password changed. Other sessions have been logged out.",
      );
      if (!result.error) form.reset();
    } catch {
      setMessage("Unable to reach the authentication service.");
    } finally {
      setPending(false);
    }
  }
  async function revoke() {
    setPending(true);
    try {
      const result = await authClient.revokeOtherSessions();
      setMessage(
        result.error
          ? "Sessions could not be revoked. Sign in again and retry."
          : "Other sessions have been logged out.",
      );
    } catch {
      setMessage("Unable to reach the authentication service.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="account-controls">
      <form onSubmit={changePassword} className="settings-form">
        <h3>Change password</h3>
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
          <small>Use between 12 and 128 characters.</small>
        </label>
        <label>
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
        <button className="button" disabled={pending}>
          Change password
        </button>
      </form>
      <hr />
      <div className="button-row">
        <button
          className="button secondary"
          disabled={pending}
          onClick={revoke}
        >
          Log out other sessions
        </button>
        <button
          className="button secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              const result = await authClient.signOut();
              if (result.error) setMessage("Sign out failed. Try again.");
              else router.replace("/login");
            } catch {
              setMessage("Sign out failed. Try again.");
            } finally {
              setPending(false);
            }
          }}
        >
          Sign out
        </button>
      </div>
      {message && (
        <p role="status" className="feedback">
          {message}
        </p>
      )}
    </div>
  );
}
