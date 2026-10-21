"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, authButton, authInput } from "../components/AuthCard";
import { Spinner } from "../components/Spinner";
import { ApiError, apiFetch, errorMessage } from "../lib/api";
import { useUrlSecret } from "../lib/useUrlSecret";
import { useT } from "../lib/i18n";

/** Opened from the link in the password-reset email. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useUrlSecret();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkDead, setLinkDead] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = useT();

  if (token === undefined) return <Spinner />;
  if (!token) {
    return (
      <AuthCard title={t("reset.incomplete")} subtitle={t("reset.incompleteNote")}>
        <Link href="/forgot-password" className="block text-center font-black underline">
          {t("reset.askNew")}
        </Link>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError(t("register.passwordError"));
    if (password !== confirm) return setError(t("reset.mismatch"));
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
    <AuthCard title={t("reset.title")} subtitle={t("reset.subtitle")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label={t("form.newPassword")}
          placeholder={t("form.newPasswordPlaceholder")}
          className={authInput}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-label={t("form.confirmNewPassword")}
          placeholder={t("form.confirmNewPassword")}
          className={authInput}
        />
        {error && (
          <p className="text-sm font-bold text-red-600" role="alert">
            {error}{" "}
            {linkDead && (
              <Link href="/forgot-password" className="underline">
                {t("reset.askNewSentence")}
              </Link>
            )}
          </p>
        )}
        <button type="submit" disabled={busy} className={authButton}>
          {busy ? t("forgot.savingCaps") : t("reset.save")}
        </button>
      </form>
    </AuthCard>
  );
}
