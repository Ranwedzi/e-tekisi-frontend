"use client";
import { apiFetch } from "./api";
import { getSession } from "./session";

// Push notifications (Web Push): the service worker (public/sw.js) shows them
// even when e-Tekisi isn't open. The browser makes the subscription with the
// server's public key; the backend stores it against the signed-in account.

export type PushState = "unsupported" | "disabled-on-server" | "blocked" | "off" | "on";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !window.isSecureContext) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // No service worker: the app works as before, just without push or the offline page.
  });
}

async function subscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function serverKey(): Promise<string | null> {
  const r = await apiFetch<{ enabled: boolean; publicKey?: string }>("/api/push/key", { auth: false });
  return r.enabled && r.publicKey ? r.publicKey : null;
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64url.length / 4) * 4, "=");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(sub: PushSubscription, key: string): boolean {
  const current = sub.options.applicationServerKey;
  if (!current) return false;
  const a = new Uint8Array(current);
  const b = keyBytes(key);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const key = await serverKey().catch(() => null);
  if (!key) return "disabled-on-server";
  const sub = await subscription();
  return Notification.permission === "granted" && sub ? "on" : "off";
}

/** Asks for permission (must follow a tap) and registers this browser for the signed-in account. */
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const key = await serverKey();
  if (!key) return "disabled-on-server";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "blocked" : "off";
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub, key)) {
    await sub.unsubscribe(); // the server's key changed: the old subscription can't be used
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  await apiFetch("/api/me/push", { method: "POST", body: sub.toJSON() });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const sub = await subscription();
  if (sub) {
    await apiFetch("/api/me/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(() => undefined);
    await sub.unsubscribe();
  }
  return "off";
}

/**
 * On app start: re-sends this browser's subscription for whoever is signed in
 * now (another person may have signed in on this phone since), and replaces
 * it if the server's key changed.
 */
export async function syncPush() {
  if (!getSession() || !pushSupported() || Notification.permission !== "granted") return;
  try {
    const sub = await subscription();
    if (!sub) return;
    const key = await serverKey();
    if (!key) return;
    if (!sameKey(sub, key)) {
      await enablePush();
      return;
    }
    await apiFetch("/api/me/push", { method: "POST", body: sub.toJSON() });
  } catch {
    // Best effort; the profile page shows the real state.
  }
}

/**
 * Before signing out: stop this browser getting the account's notifications.
 * Gives up after two seconds so signing out never hangs.
 */
export async function forgetPushOnSignOut() {
  const work = (async () => {
    const sub = await subscription();
    if (!sub) return;
    await apiFetch("/api/me/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(() => undefined);
    await sub.unsubscribe().catch(() => false);
  })().catch(() => undefined);
  await Promise.race([work, new Promise((r) => setTimeout(r, 2000))]);
}
