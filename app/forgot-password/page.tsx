"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, authButton, authInput } from "../components/AuthCard";
import { apiFetch, errorMessage } from "../lib/api";
import { useLegal } from "../lib/legal";
import { useT } from "../lib/i18n";

type Channel = "EMAIL" | "SMS";
type AccountRole = "COMMUTER" | "DRIVER";

/** "Forgot password": a reset link by email, or a code by SMS that is entered on this page. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const legal = useLegal();
  const [role, setRole] = useState<AccountRole>("COMMUTER");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [step, setStep] = useState<"ask" | "emailSent" | "code">("ask");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t("forgot.emailError"));
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/password/forgot", { method: "POST", auth: false, body: { email: email.trim(), role, channel } });
      setStep(channel === "SMS" ? "code" : "emailSent");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError(t("forgot.tooShort"));
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/password/reset", {
        method: "POST",
        auth: false,
        body: { email: email.trim(), role, code: code.trim(), newPassword: password },
      });
      router.push("/login?reason=reset");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  if (step === "emailSent") {
    return (
      <AuthCard
        title={t("forgot.checkEmail")}
        subtitle={t("forgot.checkEmailNote")}
      >
        <Link href="/login" className="block text-center font-black underline mt-2">
          {t("forgot.backToSignIn")}
        </Link>
      </AuthCard>
    );
  }

  if (step === "code") {
    return (
      <AuthCard title={t("forgot.enterCode")} subtitle={t("forgot.enterCodeNote")}>
        <form onSubmit={reset} noValidate className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label={t("gate.smsCode")}
            placeholder={t("gate.codePlaceholder")}
            className={`${authInput} tracking-[0.4em] text-center`}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label={t("form.newPassword")}
            placeholder={t("form.newPasswordPlaceholder")}
            className={authInput}
          />
          {error && (
            <p className="text-sm font-bold text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={authButton}>
            {busy ? t("forgot.savingCaps") : t("forgot.setNew")}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
      <form onSubmit={request} noValidate className="space-y-4">
        <div className="w-full bg-gray-100 p-1.5 rounded-2xl flex" role="radiogroup" aria-label={t("register.accountType")}>
          {(["COMMUTER", "DRIVER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`flex-1 py-3 rounded-xl font-black text-sm ${role === r ? "bg-white shadow-sm text-black" : "text-gray-400"}`}
            >
              {r === "COMMUTER" ? t("register.commuter") : t("register.driver")}
            </button>
          ))}
        </div>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={t("form.email")}
          placeholder={t("form.email")}
          className={authInput}
        />
        {legal?.phoneVerificationAvailable && (
          <fieldset className="text-sm font-bold text-gray-600 space-y-2">
            <legend className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{t("forgot.sendMe")}</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="channel" checked={channel === "EMAIL"} onChange={() => setChannel("EMAIL")} className="accent-black" />
              {t("forgot.byEmail")}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="channel" checked={channel === "SMS"} onChange={() => setChannel("SMS")} className="accent-black" />
              {t("forgot.bySms")}
            </label>
          </fieldset>
        )}
        {error && (
          <p className="text-sm font-bold text-red-600" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={authButton}>
          {busy ? t("forgot.sendingCaps") : t("forgot.continue")}
        </button>
      </form>
      <Link href="/login" className="block text-center text-sm font-bold text-gray-400 mt-6 underline">
        {t("forgot.backToSignIn")}
      </Link>
    </AuthCard>
  );
}
