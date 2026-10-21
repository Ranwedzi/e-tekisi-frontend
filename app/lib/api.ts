"use client";
import { API_BASE } from "./config";
import { clearSession, extendSession, getSession } from "./session";
import { errorText, translateNow } from "./i18n";

export { API_BASE };

/**
 * Sent with every call. X-Session asks sign-in to answer with httpOnly
 * cookies instead of a token in the body; X-Requested-With is the backend's
 * CSRF check for cookie-authenticated writes.
 */
export const SESSION_HEADERS = { "X-Session": "cookie", "X-Requested-With": "etekisi" } as const;

let refreshing: Promise<"ok" | "ended" | "network"> | null = null;

/**
 * Renews the session cookies (the access cookie lasts 15 minutes). Concurrent
 * callers share one request; the backend also tolerates another tab
 * refreshing at the same moment.
 */
export function refreshSession(): Promise<"ok" | "ended" | "network"> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/session/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { ...SESSION_HEADERS, Accept: "application/json" },
      });
      if (!res.ok) return res.status === 401 ? "ended" : "network";
      const data = (await res.json()) as { sessionExpiresInSeconds?: number };
      if (typeof data.sessionExpiresInSeconds === "number") extendSession(data.sessionExpiresInSeconds);
      return "ok";
    } catch {
      return "network";
    } finally {
      // Calls that failed while this was in flight share its result; any
      // later 401 starts a new refresh.
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Signs out locally and goes to /login when the server says the session is over. */
function sessionEnded(): never {
  clearSession();
  redirectToLogin("expired");
  throw new ApiError(translateNow("api.signInAgain"), 401, "UNAUTHENTICATED");
}

/** An error response from the backend (RFC 7807 ProblemDetail) or a network failure (status 0). */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors?: Record<string, string>,
    public body?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Sends an Idempotency-Key so a retried write isn't applied twice. */
  idempotencyKey?: string;
  /** Default true. Login and sign-up pass false. */
  auth?: boolean;
  signal?: AbortSignal;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function redirectToLogin(reason: string) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/login")) return;
  // A full page load on purpose: nothing from the old session survives in memory.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `/login?reason=${reason}`;
}

/**
 * Calls the backend with the session cookies. Resolves with the parsed JSON
 * body (undefined for empty responses); rejects with ApiError. On a 401 the
 * session is renewed once and the call retried; if that fails too, the user
 * is signed out and sent to /login.
 */
export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  return request<T>(path, opts, true);
}

async function request<T>(path: string, opts: ApiOptions, mayRefresh: boolean): Promise<T> {
  const { method = "GET", body, query, idempotencyKey, auth = true, signal } = opts;

  const headers: Record<string, string> = { Accept: "application/json", ...SESSION_HEADERS };
  // FormData (file uploads) sets its own multipart Content-Type with the boundary.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (auth && !getSession()) sessionEnded();

  let url = `${API_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      credentials: "include",
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(translateNow("common.offline"), 0, "NETWORK");
  }

  if (res.status === 401 && auth && mayRefresh) {
    const renewed = await refreshSession();
    if (renewed === "ok") return request<T>(path, opts, false);
    if (renewed === "ended") sessionEnded();
    throw new ApiError(translateNow("common.offline"), 0, "NETWORK");
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) sessionEnded();
    const obj = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
    const message =
      (typeof obj.detail === "string" && obj.detail) ||
      (typeof obj.message === "string" && obj.message) ||
      (typeof data === "string" && data) ||
      translateNow("api.failed", { status: res.status });
    throw new ApiError(
      message,
      res.status,
      typeof obj.code === "string" ? obj.code : undefined,
      (obj.fieldErrors as Record<string, string> | undefined) ?? undefined,
      obj,
    );
  }
  return data as T;
}

/** Downloads a protected file (e.g. a driver document) as a Blob, with the session cookies. */
export async function apiBlob(path: string, mayRefresh = true): Promise<Blob> {
  if (!getSession()) sessionEnded();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: { ...SESSION_HEADERS } });
  } catch {
    throw new ApiError(translateNow("common.offline"), 0, "NETWORK");
  }
  if (res.status === 401) {
    if (mayRefresh && (await refreshSession()) === "ok") return apiBlob(path, false);
    sessionEnded();
  }
  if (!res.ok) {
    throw new ApiError(res.status === 404 ? translateNow("api.fileMissing") : translateNow("api.failed", { status: res.status }), res.status);
  }
  return res.blob();
}

/** Opens a protected file in a new tab (the tab is opened first so pop-up blockers allow it). */
export async function openProtectedFile(path: string) {
  const tab = window.open("", "_blank");
  try {
    const url = URL.createObjectURL(await apiBlob(path));
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab?.close();
    throw e;
  }
}

/** A readable message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const translated = errorText(e.code);
    if (translated) return translated;
    if (e.fieldErrors && Object.keys(e.fieldErrors).length > 0) {
      return Object.values(e.fieldErrors).join(". ");
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return translateNow("api.generic");
}
