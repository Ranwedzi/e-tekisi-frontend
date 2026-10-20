"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, authButton, authInput } from "../components/AuthCard";
import { Spinner } from "../components/Spinner";
import { ApiError, apiFetch, errorMessage } from "../lib/api";
import { useUrlSecret } from "../lib/useUrlSecret";

/** Opened from the link in the password-reset email. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useUrlSecret();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkDead, setLinkDead] = useState(false);
  const [busy, setBusy] = useState(false);

  if (token === undefined) return <Spinner />;
  if (!token) {
    return (
      <AuthCard title="Link incomplete" subtitle="Open the link straight from the email, or ask for a new one.">
        <Link href="/forgot-password" className="block text-center font-black underline">
          Ask for a new link
        </Link>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError("Use at least 10 characters. A few unrelated words make a good password.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    try {
      await apiFetch("/api/auth/password/reset", { method: "POST", auth: false, body: { token, newPassword: password } });
      router.push("/login?reason=reset");
    } catch (err) {
      setLinkDead(err instanceof ApiError && (err.code === "LINK_EXPIRED" || err.code === "INVALID_LINK"));
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be signed out on your other devices.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="New password"
          placeholder="New password (10+ characters)"
          className={authInput}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-label="Confirm new password"
          placeholder="Confirm new password"
          className={authInput}
        />
        {error && (
          <p className="text-sm font-bold text-red-600" role="alert">
            {error}{" "}
            {linkDead && (
              <Link href="/forgot-password" className="underline">
                Ask for a new link.
              </Link>
            )}
          </p>
        )}
        <button type="submit" disabled={busy} className={authButton}>
          {busy ? "SAVING..." : "SAVE PASSWORD"}
        </button>
      </form>
    </AuthCard>
  );
}
