"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AuthCard } from "../components/AuthCard";
import { Spinner } from "../components/Spinner";
import { apiFetch, errorMessage } from "../lib/api";
import { homeFor, useSession } from "../lib/session";
import { useUrlSecret } from "../lib/useUrlSecret";
import { useT } from "../lib/i18n";

/** Opened from the link in the verification email. */
export default function VerifyEmailPage() {
  const token = useUrlSecret();
  const { session } = useSession();
  // message null: the standard text for the outcome, in the reader's language.
  const [result, setResult] = useState<{ ok: boolean; message: string | null } | null>(null);
  const t = useT();
  const sent = useRef(false);

  useEffect(() => {
    if (token === undefined || sent.current) return;
    sent.current = true;
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult({ ok: false, message: null });
      return;
    }
    apiFetch("/api/auth/verify-email", { method: "POST", auth: false, body: { token } })
      .then(() => setResult({ ok: true, message: null }))
      .catch((e) => setResult({ ok: false, message: errorMessage(e) }));
  }, [token]);

  if (!result) return <Spinner label={t("verify.confirming")} />;
  return (
    <AuthCard
      title={result.ok ? t("verify.confirmed") : t("verify.failed")}
      subtitle={result.message ?? (result.ok ? t("verify.ok") : t("verify.incomplete"))}
    >
      <Link
        href={session ? homeFor(session.role) : "/login"}
        className="block text-center w-full bg-[#1A1A1A] text-white font-black py-4 rounded-2xl mt-2"
      >
        {session ? t("verify.continue") : t("verify.signIn")}
      </Link>
    </AuthCard>
  );
}
