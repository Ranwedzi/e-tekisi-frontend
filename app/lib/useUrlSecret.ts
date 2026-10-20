"use client";
import { useEffect, useState } from "react";

/** Secrets already taken out of the address bar, so a re-run effect (React Strict Mode) still sees them. */
const taken = new Map<string, string | null>();

function take(name: string): string | null {
  const url = new URL(window.location.href);
  const v = url.searchParams.get(name);
  if (v !== null) {
    taken.set(name, v);
    url.searchParams.delete(name);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    return v;
  }
  return taken.get(name) ?? null;
}

/**
 * Reads ?token= from the address bar once, then removes it, so the secret
 * isn't left in the history, in bookmarks or in a Referer header.
 * Returns undefined while reading, null if there was none.
 */
export function useUrlSecret(name = "token"): string | null | undefined {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    // A one-off read of the address bar on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(take(name));
  }, [name]);
  return value;
}
