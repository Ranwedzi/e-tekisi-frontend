"use client";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { apiFetch, errorMessage } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import type { AccountStatus } from "../lib/types";
import type { Role } from "../lib/types";

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
        <h1 className="text-2xl font-black mb-3">Our terms have changed</h1>
        <p className="text-sm font-bold text-gray-500 mb-6">
          Please read the updated documents and accept them to keep using e-Tekisi.
        </p>
        <ul className="space-y-2 mb-6 text-sm font-black underline">
          <li><Link href="/terms" target="_blank">Terms of use</Link></li>
          <li><Link href="/privacy" target="_blank">Privacy policy</Link></li>
          {role === "DRIVER" && <li><Link href="/driver-agreement" target="_blank">Driver agreement</Link></li>}
        </ul>
        <label className="flex items-start gap-3 text-xs font-bold text-gray-600 mb-6">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-5 h-5 accent-black" />
          I have read and accept these documents.
        </label>
        {error && <p className="text-sm font-bold text-red-600 mb-3" role="status">{error}</p>}
        <button
          disabled={!checked || busy}
          onClick={accept}
          className="w-full bg-[#1A1A1A] text-white font-black py-4 rounded-2xl disabled:opacity-50"
        >
          {busy ? "Saving…" : "Accept and continue"}
        </button>
      </div>
    </div>
  );
}

function VerifyBanner({ status, onVerified }: { status: AccountStatus; onVerified: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
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
      setMsg("Sent. Check your inbox (and spam folder) for the link.");
    });
  const sendCode = () =>
    run(async () => {
      await apiFetch("/api/me/verification/phone", { method: "POST" });
      setCodeSent(true);
      setMsg("We've sent you an SMS with a 6-digit code.");
    });
  const confirm = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await apiFetch("/api/me/verification/phone/confirm", { method: "POST", body: { code: code.trim() } });
      onVerified();
    });
  };

  return (
    <div className="bg-black text-white px-4 py-3 text-sm" role="region" aria-label="Verify your account">
      <p className="font-black text-[#FFD217]">Verify your account to book and pay</p>
      <p className="font-bold text-gray-300 text-xs mt-1">
        We sent a link to your email{status.phoneVerificationAvailable ? " and a code to your phone" : ""}. Open the link, or
        enter the code here.
      </p>
      <div className="flex flex-wrap gap-2 mt-2">
        <button disabled={busy} onClick={resend} className="px-3 py-2 rounded-xl bg-white/10 font-black text-xs uppercase disabled:opacity-50">
          Resend email
        </button>
        {status.phoneVerificationAvailable && !codeSent && (
          <button disabled={busy} onClick={sendCode} className="px-3 py-2 rounded-xl bg-white/10 font-black text-xs uppercase disabled:opacity-50">
            Text me a new code
          </button>
        )}
        <button disabled={busy} onClick={onVerified} className="px-3 py-2 rounded-xl bg-white/10 font-black text-xs uppercase disabled:opacity-50">
          I&apos;ve verified
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
            aria-label="SMS code"
            placeholder="6-digit code"
            className="w-32 p-2 rounded-xl bg-white text-black font-black tracking-widest"
          />
          <button type="submit" disabled={busy || code.trim().length !== 6} className="px-3 rounded-xl bg-[#FFD217] text-black font-black text-xs uppercase disabled:opacity-50">
            Confirm
          </button>
        </form>
      )}
      {msg && <p className="text-xs font-bold mt-2" role="status">{msg}</p>}
    </div>
  );
}
