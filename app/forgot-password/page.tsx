"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, authButton, authInput } from "../components/AuthCard";
import { apiFetch, errorMessage } from "../lib/api";
import { useLegal } from "../lib/legal";

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

  const request = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter the email address you signed up with.");
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
      setError("Use at least 10 characters for your new password.");
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
        title="Check your email"
        subtitle="If an account uses that address, we've sent it a link to choose a new password. It works for 1 hour."
      >
        <Link href="/login" className="block text-center font-black underline mt-2">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  if (step === "code") {
    return (
      <AuthCard title="Enter the code" subtitle="If an account uses that email, we've sent a 6-digit code by SMS to its phone number.">
        <form onSubmit={reset} noValidate className="space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label="SMS code"
            placeholder="6-digit code"
            className={`${authInput} tracking-[0.4em] text-center`}
          />
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="New password"
            placeholder="New password (10+ characters)"
            className={authInput}
          />
          {error && (
            <p className="text-sm font-bold text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={authButton}>
            {busy ? "SAVING..." : "SET NEW PASSWORD"}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll help you choose a new one.">
      <form onSubmit={request} noValidate className="space-y-4">
        <div className="w-full bg-gray-100 p-1.5 rounded-2xl flex" role="radiogroup" aria-label="Account type">
          {(["COMMUTER", "DRIVER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`flex-1 py-3 rounded-xl font-black text-sm ${role === r ? "bg-white shadow-sm text-black" : "text-gray-400"}`}
            >
              {r === "COMMUTER" ? "Commuter" : "Driver"}
            </button>
          ))}
        </div>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          placeholder="Email address"
          className={authInput}
        />
        {legal?.phoneVerificationAvailable && (
          <fieldset className="text-sm font-bold text-gray-600 space-y-2">
            <legend className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Send me</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="channel" checked={channel === "EMAIL"} onChange={() => setChannel("EMAIL")} className="accent-black" />
              A link by email
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="channel" checked={channel === "SMS"} onChange={() => setChannel("SMS")} className="accent-black" />
              A code by SMS to my phone
            </label>
          </fieldset>
        )}
        {error && (
          <p className="text-sm font-bold text-red-600" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={authButton}>
          {busy ? "SENDING..." : "CONTINUE"}
        </button>
      </form>
      <Link href="/login" className="block text-center text-sm font-bold text-gray-400 mt-6 underline">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
