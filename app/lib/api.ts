"use client";
import { clearSession, getSession } from "./session";

/** Backend origin. Set NEXT_PUBLIC_API_URL in .env.local for anything but local dev. */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

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
  window.location.href = `/login?reason=${reason}`;
}

/**
 * Calls the backend with the signed-in user's token. Resolves with the parsed
 * JSON body (undefined for empty responses); rejects with ApiError.
 * A 401 means the session is gone: it is cleared and the user sent to /login.
 */
export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, query, idempotencyKey, auth = true, signal } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (auth) {
    const session = getSession();
    if (!session) {
      clearSession();
      redirectToLogin("expired");
      throw new ApiError("Please sign in again.", 401, "UNAUTHENTICATED");
    }
    headers.Authorization = `Bearer ${session.token}`;
  }

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
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("Can't reach e-Tekisi. Check your connection and try again.", 0, "NETWORK");
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
    if (res.status === 401 && auth) {
      clearSession();
      redirectToLogin("expired");
    }
    const obj = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
    const message =
      (typeof obj.detail === "string" && obj.detail) ||
      (typeof obj.message === "string" && obj.message) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
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

/** A readable message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.fieldErrors && Object.keys(e.fieldErrors).length > 0) {
      return Object.values(e.fieldErrors).join(". ");
    }
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong.";
}
