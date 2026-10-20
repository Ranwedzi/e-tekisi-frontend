"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useSession, type Session } from "../lib/session";
import type { Role } from "../lib/types";
import { Spinner } from "./Spinner";
import { AccountGate } from "./AccountGate";

const SessionContext = createContext<Session | null>(null);

/**
 * Renders children only for a signed-in user with one of `roles`.
 * Signed-out users go to /login; signed-in users with the wrong role go to
 * their own home screen. Inside, `useAuthedSession()` returns the session.
 */
export function RequireAuth({ roles, children, dark = false }: { roles?: Role[]; children: ReactNode; dark?: boolean }) {
  const { session, ready } = useSession();
  const router = useRouter();
  const allowed = !!session && (!roles || roles.includes(session.role));

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (!allowed) router.replace(homeFor(session.role));
  }, [ready, session, allowed, router]);

  if (!ready || !allowed) return <Spinner dark={dark} />;
  const isStaff = session.role === "OPERATOR" || session.role === "ADMIN";
  return (
    <SessionContext.Provider value={session}>
      {isStaff ? children : <AccountGate role={session.role}>{children}</AccountGate>}
    </SessionContext.Provider>
  );
}

export function useAuthedSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useAuthedSession must be used inside <RequireAuth>");
  return s;
}
