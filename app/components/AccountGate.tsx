"use client";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch, errorMessage } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import type { AccountStatus } from "../lib/types";
import type { Role } from "../lib/types";
import { useT } from "../lib/i18n";

/**
 * For signed-in commuters and drivers:
 * - asks them to accept the current terms if they haven't (blocking), and
 * - shows a banner until their email or phone number is verified (booking,
 *   top-ups, going online and offers are refused by the API until then).
 */
export function AccountGate({ role, children }: { role: Role; children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiFetch<AccountStatus>("/api/me/status"));
    } catch {
      // Offline or the API is down: don't block the app on this.
    }
  }, []);

  // Re-checked every minute, so verifying in another tab (the email link) clears the banner.
  usePolling(load, 60_000);

  if (status && !status.termsAccepted) {
    return <TermsPrompt role={role} version={status.currentTermsVersion} onAccepted={load} />;
  }
  return (
    <>
      {status && !status.verified && <VerifyBanner status={status} onVerified={load} />}
      {children}
    </>
  );
}

function TermsPrompt({ role, version, onAccepted }: { role: Role; version: string; onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/me/terms", { method: "POST", body: { version } });
      onAccepted();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFD217] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-[40px] p-8 shadow-2xl">
        <h1 className="text-2xl font-black mb-3">{t("gate.termsChanged")}</h1>
        <p className="text-sm font-bold text-gray-500 mb-6">
          {t("gate.termsIntro")}
        </p>
        <ul className="space-y-2 mb-6 text-sm font-black underline">
          <li><Link href="/terms" target="_blank">{t("legal.terms")}</Link></li>
          <li><Link href="/privacy" target="_blank">{t("legal.privacy")}</Link></li>
          {role === "DRIVER" && <li><Link href="/driver-agreement" target="_blank">{t("legal.driverAgreement")}</Link></li>}
        </ul>
        <label className="flex items-start gap-3 text-xs font-bold text-gray-600 mb-6">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 accent-black" />
          {t("gate.accept")}
        </label>
        {error && <p className="text-sm font-bold text-red-600 mb-3" role="status">{error}</p>}
        <button
          disabled={!checked || busy}
          onClick={accept}
          className="w-full bg-[#1A1A1A] text-white font-black py-4 rounded-2xl disabled:opacity-50"
        >
          {busy ? t("common.saving") : t("gate.acceptContinue")}
        </button>
      </div>
    </div>
  );
}

function VerifyBanner({ status, onVerified }: { status: AccountStatus; onVerified: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useT();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = () =>
    run(async () => {
      await apiFetch("/api/me/verification/email", { method: "POST" });
      setMsg(t("gate.emailSent"));
    });
  const sendCode = () =>
    run(async () => {
      await apiFetch("/api/me/verification/phone", { method: "POST" });
      setCodeSent(true);
      setMsg(t("gate.smsSent"));
    });
  const confirm = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await apiFetch("/api/me/verification/phone/confirm", { method: "POST", body: { code: code.trim() } });
      onVerified();
    });
  };

  return (
    <div className="bg-black text-white px-4 py-3 text-sm" role="region" aria-label={t("gate.verifyRegion")}>
      <p className="font-black text-[#FFD217]">{t("gate.verifyTitle")}</p>
      <p className="font-bold text-gray-300 text-xs mt-1">
        {status.phoneVerificationAvailable ? t("gate.verifyEmailAndPhone") : t("gate.verifyEmailOnly")}
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        <button disabled={busy} onClick={resend} className="px-3 py-2 rounded-xl bg-white/10 font-black text-xs uppercase disabled:opacity-50">
          {t("gate.resendEmail")}
        </button>
        {status.phoneVerificationAvailable && !codeSent && (
          <button disabled={busy} onClick={sendCode} className="px-3 py-2 rounded-xl bg-white/10 font-black text-xs uppercase disabled:opacity-50">
            {t("gate.newCode")}
          </button>
        )}
        <button disabled={busy} onClick={onVerified} className="px-3 py-2 rounded-xl bg-white/10 font-black text-xs uppercase disabled:opacity-50">
          {t("gate.verified")}
        </button>
      </div>
      {status.phoneVerificationAvailable && (
        <form onSubmit={confirm} className="flex gap-2 mt-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label={t("gate.smsCode")}
            placeholder={t("gate.codePlaceholder")}
            className="w-32 p-2 rounded-xl bg-white text-black font-black tracking-widest"
          />
          <button type="submit" disabled={busy || code.trim().length !== 6} className="px-3 rounded-xl bg-[#FFD217] text-black font-black text-xs uppercase disabled:opacity-50">
            {t("common.confirm")}
          </button>
        </form>
      )}
      {msg && <p className="text-xs font-bold mt-2" role="status">{msg}</p>}
    </div>
  );
}
