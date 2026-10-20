"use client";
import { useEffect, useState } from "react";

/**
 * Reads ?token= from the address bar once, then removes it, so the secret
 * isn't left in the history, in bookmarks or in a Referer header.
 * Returns undefined while reading, null if there was none.
 */
export function useUrlSecret(name = "token"): string | null | undefined {
  const [value, setValue] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const url = new URL(window.location.href);
    const v = url.searchParams.get(name);
    if (v) {
      url.searchParams.delete(name);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    // A one-off read of the address bar on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(v);
  }, [name]);
  return value;
}
