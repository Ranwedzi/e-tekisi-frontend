import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, errorMessage } from "./api";
import { getSession, saveSession } from "./session";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

let store: Map<string, string>;
let calls: { url: string; init?: RequestInit }[];
let location: { pathname: string; href: string };

function stubFetch(handler: Handler) {
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  });
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  store = new Map();
  calls = [];
  location = { pathname: "/", href: "/" };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
    location,
  });
  saveSession(7, "COMMUTER", 3600);
});

describe("apiFetch with cookie sessions", () => {
  it("sends cookies and the CSRF header, never an Authorization header", async () => {
    stubFetch(() => json(200, { ok: true }));
    await apiFetch("/api/me/status");
    const init = calls[0].init!;
    expect(init.credentials).toBe("include");
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Requested-With"]).toBe("etekisi");
    expect(headers["X-Session"]).toBe("cookie");
    expect(headers.Authorization).toBeUndefined();
  });

  it("renews an expired access cookie once and retries the call", async () => {
    let first = true;
    stubFetch((url) => {
      if (url.endsWith("/api/auth/session/refresh")) return json(200, { sessionExpiresInSeconds: 86_400 });
      if (first) {
        first = false;
        return json(401, { code: "UNAUTHENTICATED" });
      }
      return json(200, { balance: 50 });
    });
    await expect(apiFetch<{ balance: number }>("/api/wallet/7")).resolves.toEqual({ balance: 50 });
    expect(calls.map((c) => c.url.replace(/^https?:\/\/[^/]+/, ""))).toEqual([
      "/api/wallet/7",
      "/api/auth/session/refresh",
      "/api/wallet/7",
    ]);
    expect(getSession()!.expiresAt).toBeGreaterThan(Date.now() + 86_000_000);
  });

  it("shares one refresh between calls that fail together", async () => {
    let refreshed = false;
    stubFetch(async (url) => {
      if (url.endsWith("/refresh")) {
        await new Promise((r) => setTimeout(r, 10));
        refreshed = true;
        return json(200, { sessionExpiresInSeconds: 3600 });
      }
      return refreshed ? json(200, {}) : json(401, {});
    });
    await Promise.all([apiFetch("/api/a"), apiFetch("/api/b"), apiFetch("/api/c")]);
    expect(calls.filter((c) => c.url.endsWith("/refresh"))).toHaveLength(1);
  });

  it("signs out and goes to /login when the session has ended", async () => {
    stubFetch((url) => (url.endsWith("/refresh") ? json(401, { code: "SESSION_ENDED" }) : json(401, {})));
    await expect(apiFetch("/api/wallet/7")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
    expect(getSession()).toBeNull();
    expect(location.href).toBe("/login?reason=expired");
  });

  it("doesn't sign out when the network drops during a refresh", async () => {
    stubFetch((url) => {
      if (url.endsWith("/refresh")) throw new TypeError("Failed to fetch");
      return json(401, {});
    });
    await expect(apiFetch("/api/wallet/7")).rejects.toMatchObject({ status: 0, code: "NETWORK" });
    expect(getSession()).not.toBeNull();
  });
});

describe("errorMessage", () => {
  it("joins field errors", () => {
    expect(errorMessage(new ApiError("Bad", 400, "VALIDATION", { email: "Enter an email.", phone: "Enter a phone." }))).toBe(
      "Enter an email.. Enter a phone.",
    );
  });

  it("uses the server's detail in English", () => {
    store.set("etekisi_locale", "en");
    expect(errorMessage(new ApiError("Wallet balance is too low.", 409, "INSUFFICIENT_FUNDS"))).toBe("Wallet balance is too low.");
  });

  it("uses the translation for a known code in another language", () => {
    store.set("etekisi_locale", "af");
    expect(errorMessage(new ApiError("Wallet balance is too low.", 409, "INSUFFICIENT_FUNDS"))).toBe("Jou balans is te laag.");
  });
});
