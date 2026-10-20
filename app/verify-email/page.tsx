"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { Spinner } from "../components/Spinner";
import { apiFetch, errorMessage } from "../lib/api";
import { homeFor, useSession } from "../lib/session";
import { useUrlSecret } from "../lib/useUrlSecret";

/** Opened from the link in the verification email. */
export default function VerifyEmailPage() {
  const token = useUrlSecret();
  const { session } = useSession();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (token === undefined || sent.current) return;
    sent.current = true;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult({ ok: false, message: "This link is incomplete. Open it straight from the email." });
      return;
    }
    apiFetch("/api/auth/verify-email", { method: "POST", auth: false, body: { token } })
      .then(() => setResult({ ok: true, message: "Your email address is confirmed. You can book and pay now." }))
      .catch((e) => setResult({ ok: false, message: errorMessage(e) }));
  }, [token]);

  if (!result) return <Spinner label="Confirming your email" />;
  return (
    <AuthCard title={result.ok ? "Email confirmed" : "Couldn't confirm"} subtitle={result.message}>
      <Link
        href={session ? homeFor(session.role) : "/login"}
        className="block text-center w-full bg-[#1A1A1A] text-white font-black py-4 rounded-2xl mt-2"
      >
        {session ? "Continue" : "Sign in"}
      </Link>
    </AuthCard>
  );
}
