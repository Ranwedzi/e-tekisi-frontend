"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { API_BASE, SESSION_HEADERS, refreshSession } from "./api";
import { getSession } from "./session";
import { usePolling } from "./usePolling";

/**
 * One live-event stream per tab (GET /api/events), shared by every hook.
 * Events only say which topic changed ("bookings", "messages:42", ...); the
 * page then refetches through the normal API. Read with fetch (with the
 * session cookies) so an expired access cookie can be renewed and retried.
 * Reconnects with backoff; disconnects when nothing is listening.
 */
type Listener = (topic: string) => void;

const listeners = new Set<Listener>();
const statusListeners = new Set<() => void>();
let connected = false;
let abort: AbortController | null = null;

function setConnected(v: boolean) {
  if (connected === v) return;
  connected = v;
  statusListeners.forEach((l) => l());
}

async function run(signal: AbortSignal) {
  let backoff = 1000;
  while (!signal.aborted) {
    if (!getSession()) break;
    try {
      const res = await fetch(`${API_BASE}/api/events`, {
        headers: { ...SESSION_HEADERS, Accept: "text/event-stream" },
        credentials: "include",
        cache: "no-store",
        signal,
      });
      if (res.status === 401) {
        // The access cookie lapsed: renew and reconnect. Ended: polling handles the redirect.
        const renewed = await refreshSession();
        if (renewed === "ended") break;
        if (renewed === "ok") continue;
        throw new Error("offline");
      }
      if (res.status === 403) break;
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let event = "message";
      let data = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).replace(/\r$/, "");
          buffer = buffer.slice(nl + 1);
          if (line === "") {
            if (event === "ready") {
              setConnected(true);
              backoff = 1000;
            } else if (event === "change" && data) {
              listeners.forEach((l) => l(data));
            }
            event = "message";
            data = "";
          } else if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            data += line.slice(5).trim();
          }
        }
      }
    } catch {
      if (signal.aborted) break;
    }
    setConnected(false);
    await new Promise((r) => setTimeout(r, backoff));
    backoff = Math.min(backoff * 2, 30_000);
  }
  setConnected(false);
}

function ensureRunning() {
  if (abort || listeners.size === 0) return;
  abort = new AbortController();
  const mine = abort;
  void run(mine.signal).finally(() => {
    if (abort === mine) abort = null;
  });
}

function maybeStop() {
  if (listeners.size === 0 && abort) {
    abort.abort();
    abort = null;
  }
}

/** True while the live stream is open. */
export function useLiveConnected(): boolean {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => connected,
    () => false,
  );
}

/** Calls `onChange` (at most every 250 ms) when one of `topics` changes. */
export function useLiveTopics(topics: string[], onChange: () => void) {
  const fn = useRef(onChange);
  useEffect(() => {
    fn.current = onChange;
  });
  const key = topics.join(",");
  useEffect(() => {
    const wanted = new Set(key.split(",").filter(Boolean));
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener: Listener = (topic) => {
      if (!wanted.has(topic)) return;
      clearTimeout(timer);
      timer = setTimeout(() => fn.current(), 250);
    };
    listeners.add(listener);
    ensureRunning();
    return () => {
      clearTimeout(timer);
      listeners.delete(listener);
      maybeStop();
    };
  }, [key]);
}

/**
 * Polling that relaxes while the live stream is up: refetch straight away on
 * `topics`, and poll every `fastMs` without a stream or `slowMs` with one
 * (a safety net if an event is missed).
 */
export function useLivePolling(fn: () => Promise<unknown>, topics: string[], fastMs: number, slowMs = 30_000, enabled = true) {
  const live = useLiveConnected();
  usePolling(fn, live ? Math.max(slowMs, fastMs) : fastMs, enabled);
  useLiveTopics(enabled ? topics : [], () => void fn().catch(() => {}));
}
