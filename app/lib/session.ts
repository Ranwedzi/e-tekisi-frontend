"use client";
import { useMemo, useSyncExternalStore } from "react";
import type { Role } from "./types";

// The signed-in user. The token is the backend's JWT; userId and role are
// copies of its claims so pages can build URLs without decoding it.
export interface Session {
  token: string;
  userId: number;
  role: Role;
  /** Epoch ms when the token stops being accepted. */
  expiresAt: number;
}

const KEY = "etekisi_session";
const CHANGE_EVENT = "etekisi-session-change";

function read(): Session | null {
  if (typeof window === "undefined") return null;
  return parse(safeGet());
}

function safeGet(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null | undefined): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Session>;
    if (!s.token || typeof s.userId !== "number" || !s.role || typeof s.expiresAt !== "number") return null;
    return s as Session;
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  const s = read();
  return s && s.expiresAt > Date.now() ? s : null;
}

export function saveSession(token: string, userId: number, role: Role, expiresInSeconds: number) {
  const session: Session = { token, userId, role, expiresAt: Date.now() + expiresInSeconds * 1000 };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode / storage blocked: the user will simply have to sign in again.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Signs out and loads `url` as a fresh page. Unlike clearSession it doesn't
 * notify this tab first, so RequireAuth can't redirect to plain /login before
 * we get there (other tabs still see the storage change and sign out).
 */
export function signOutTo(url: string) {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.location.replace(url);
}

export function homeFor(role: Role): string {
  if (role === "DRIVER") return "/driver";
  if (role === "OPERATOR" || role === "ADMIN") return "/ops";
  return "/";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * The current session, kept in sync with localStorage (including other tabs).
 * `ready` is false during server rendering / hydration, when storage can't be read.
 * Expiry isn't checked here (render must stay pure): SessionWatcher clears an
 * expired session, and apiFetch refuses to send one.
 */
export function useSession(): { session: Session | null; ready: boolean } {
  const raw = useSyncExternalStore<string | null | undefined>(subscribe, safeGet, () => undefined);
  return useMemo(
    () => (raw === undefined ? { session: null, ready: false } : { session: parse(raw), ready: true }),
    [raw],
  );
}
