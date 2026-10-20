"use client";
import { useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { apiFetch, errorMessage } from "../lib/api";
import type { LoginResponse } from "../lib/types";

export interface MfaChallenge {
  status: "MFA_REQUIRED" | "MFA_SETUP_REQUIRED";
  mfaToken: string;
  message?: string;
}

interface Setup {
  secret: string;
  otpauthUrl: string;
}

const codeInput =
  "w-full p-5 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-black text-black text-center tracking-[0.4em] text-xl";
const primary =
  "w-full bg-[#FFD217] text-black font-black py-5 rounded-[28px] shadow-xl active:scale-95 transition-all disabled:opacity-60";

/** QR code for an otpauth:// URL, drawn locally (the secret never leaves the browser). */
export function QrCode({ text }: { text: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(text, { margin: 1, width: 220 }).then((url) => live && setSrc(url));
    return () => {
      live = false;
    };
  }, [text]);
  // A data: URL generated in the browser; next/image adds nothing here.
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="QR code for your authenticator app" width={220} height={220} className="mx-auto rounded-xl" /> : null;
}

/** Shows the secret both as a QR code and as text (for typing into the app). */
export function SetupInstructions({ setup }: { setup: Setup }) {
  return (
    <div className="space-y-3 text-sm font-bold text-gray-600">
      <p>1. Open an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password…) and scan this code:</p>
      <QrCode text={setup.otpauthUrl} />
      <p className="text-xs">
        Can&apos;t scan? Enter this key: <code className="break-all bg-gray-100 px-1 rounded">{setup.secret.replace(/(.{4})/g, "$1 ").trim()}</code>
      </p>
      <p>2. Enter the 6-digit code the app shows.</p>
    </div>
  );
}

/** One-time recovery codes, shown right after MFA is turned on. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-gray-600">
        Save these recovery codes somewhere safe (a password manager). Each one signs you in once if you lose your phone. They
        won&apos;t be shown again.
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono font-black text-sm bg-gray-50 p-4 rounded-2xl" aria-label="Recovery codes">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <button onClick={onDone} className={primary}>
        I&apos;VE SAVED THEM
      </button>
    </div>
  );
}

/** Second step of staff sign-in: enter a code, or set MFA up the first time. */
export function StaffMfaStep({ challenge, onSignedIn }: { challenge: MfaChallenge; onSignedIn: (r: LoginResponse) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [done, setDone] = useState<(LoginResponse & { recoveryCodes: string[] }) | null>(null);

  useEffect(() => {
    if (challenge.status !== "MFA_SETUP_REQUIRED") return;
    apiFetch<Setup>("/api/auth/mfa/setup", { method: "POST", auth: false, body: { mfaToken: challenge.mfaToken } })
      .then(setSetup)
      .catch((e) => setError(errorMessage(e)));
  }, [challenge]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (challenge.status === "MFA_REQUIRED") {
        onSignedIn(
          await apiFetch<LoginResponse>("/api/auth/mfa/verify", {
            method: "POST",
            auth: false,
            body: { mfaToken: challenge.mfaToken, code: code.trim() },
          }),
        );
      } else {
        setDone(
          await apiFetch<LoginResponse & { recoveryCodes: string[] }>("/api/auth/mfa/enable", {
            method: "POST",
            auth: false,
            body: { mfaToken: challenge.mfaToken, code: code.trim() },
          }),
        );
      }
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  if (done) return <RecoveryCodes codes={done.recoveryCodes} onDone={() => onSignedIn(done)} />;

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4" noValidate>
      <h2 className="text-xl font-black text-center">
        {challenge.status === "MFA_REQUIRED" ? "Two-step sign-in" : "Set up two-step sign-in"}
      </h2>
      {challenge.status === "MFA_REQUIRED" ? (
        <p className="text-sm font-bold text-gray-500 text-center">
          Enter the 6-digit code from your authenticator app, or one of your recovery codes.
        </p>
      ) : (
        <>
          <p className="text-sm font-bold text-gray-500">Staff accounts need a code from your phone as well as the password.</p>
          {setup && <SetupInstructions setup={setup} />}
        </>
      )}
      <input
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode={challenge.status === "MFA_REQUIRED" ? "text" : "numeric"}
        autoComplete="one-time-code"
        maxLength={11}
        aria-label="Authentication code"
        placeholder="123456"
        className={codeInput}
      />
      {error && (
        <p role="alert" className="text-sm font-bold text-red-600 px-2">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || code.trim().length < 6} className={primary}>
        {busy ? "CHECKING..." : challenge.status === "MFA_REQUIRED" ? "VERIFY" : "TURN ON AND SIGN IN"}
      </button>
    </form>
  );
}
