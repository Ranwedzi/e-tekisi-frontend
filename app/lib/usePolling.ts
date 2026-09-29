"use client";
import { useEffect, useRef } from "react";

/**
 * Runs `fn` now and then every `intervalMs` while `enabled`.
 * - The first run always happens. Later runs pause while the tab is hidden and
 *   resume straight away when it's shown again.
 * - Backs off (2x per consecutive failure, up to 60 s) when `fn` throws.
 * - Never overlaps: the next run is scheduled after the previous one finishes.
 * `fn` can change every render; the latest one is always used.
 */
export function usePolling(fn: () => Promise<unknown>, intervalMs: number, enabled = true) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let running = false;
    let failures = 0;

    const schedule = (ms: number) => {
      clearTimeout(timer);
      if (!stopped) timer = setTimeout(tick, ms);
    };

    let loadedOnce = false;

    async function tick() {
      if (stopped || running) return;
      // Always load once, even in a background tab; after that, pause while hidden (onVisible resumes).
      if (loadedOnce && document.visibilityState === "hidden") return;
      loadedOnce = true;
      running = true;
      try {
        await fnRef.current();
        failures = 0;
      } catch {
        failures = Math.min(failures + 1, 5);
      } finally {
        running = false;
      }
      schedule(Math.min(intervalMs * 2 ** failures, 60_000));
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void tick();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, enabled]);
}
