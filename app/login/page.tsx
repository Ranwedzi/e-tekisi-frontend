"use client";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, apiFetch, errorMessage } from "../lib/api";
import { homeFor, saveSession, useSession } from "../lib/session";
import type { LoginResponse, Role } from "../lib/types";
import { TaxiIcon } from "../components/Icons";
import { Spinner } from "../components/Spinner";

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { session, ready } = useSession();
  const [role, setRole] = useState<Role>("COMMUTER");
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in: go straight to the right home screen.
  useEffect(() => {
    if (ready && session) router.replace(homeFor(session.role));
  }, [ready, session, router]);

  const notice =
    params.get("reason") === "expired"
      ? "Your session has ended. Please sign in again."
      : params.get("registered") === "1"
        ? "Account created. You can sign in now."
        : null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email: email.trim(), password, role },
      });
      saveSession(data.token, data.userId, data.role, data.expiresInSeconds);
      router.replace(homeFor(data.role));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Invalid email or password." : errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 font-sans">
      <div className="w-20 h-20 bg-[#FFD217] rounded-full flex items-center justify-center mb-6 shadow-xl text-black">
        <TaxiIcon className="w-10 h-10" strokeWidth={2.5} />
      </div>

      <h1 className="text-4xl font-black mb-2 text-[#1A1A1A]">Welcome Back</h1>
      <p className="text-gray-400 font-bold mb-10 text-sm uppercase tracking-widest">Digital Taxi Gateway</p>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4" noValidate>
        {notice && <p className="p-4 rounded-2xl bg-yellow-50 text-yellow-800 text-sm font-bold">{notice}</p>}

        <div className="flex bg-gray-100 p-1 rounded-2xl mb-4 border border-gray-200" role="radiogroup" aria-label="Sign in as">
          {(["COMMUTER", "DRIVER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={role === r}
              onClick={() => setRole(r)}
              className={`flex-1 py-3 rounded-xl font-black text-xs ${role === r ? "bg-white shadow text-black" : "text-gray-400"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <input
          type="email"
          autoComplete="email"
          aria-label="Email address"
          className="w-full p-5 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-bold text-black"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            autoComplete="current-password"
            aria-label="Password"
            className="w-full p-5 bg-gray-50 rounded-[28px] border border-gray-100 outline-none font-bold text-black"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-5 top-6 text-[10px] font-black text-gray-400 uppercase tracking-widest"
          >
            {showPass ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm font-bold text-red-600 px-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#FFD217] text-black font-black py-6 rounded-[28px] shadow-xl mt-6 active:scale-95 transition-all text-lg disabled:opacity-60"
        >
          {submitting ? "SIGNING IN..." : "LOGIN"}
        </button>

        <p className="text-center mt-8 text-sm font-bold text-gray-400">
          New to e-Tekisi?{" "}
          <Link href="/register" className="text-black underline">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
