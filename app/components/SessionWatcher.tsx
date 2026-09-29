"use client";
import { useEffect } from "react";
import { clearSession, getSession } from "../lib/session";

const KEY = "etekisi_session";

/**
 * Signs the user out when their token expires (the backend's expiry, not a
 * separate client-side timer), and sends them to /login.
 */
export function SessionWatcher() {
  useEffect(() => {
    const check = () => {
      let hasStored = false;
      try {
        hasStored = !!window.localStorage.getItem(KEY);
      } catch {
        return;
      }
      if (hasStored && !getSession()) {
        clearSession();
        if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
          window.location.href = "/login?reason=expired";
        }
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);
  return null;
}
