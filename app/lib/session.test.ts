import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, extendSession, getSession, homeFor, saveSession } from "./session";

const KEY = "etekisi_session";
let store: Map<string, string>;
let fetchCalls: string[];

beforeEach(() => {
  store = new Map();
  fetchCalls = [];
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
  });
  vi.stubGlobal("fetch", (url: string) => {
    fetchCalls.push(url);
    return Promise.resolve(new Response(null, { status: 200 }));
  });
});

describe("session", () => {
  it("stores who is signed in, and no token", () => {
    saveSession(7, "DRIVER", 3600);
    expect(getSession()).toMatchObject({ userId: 7, role: "DRIVER" });
    expect(store.get(KEY)).not.toContain("token");
  });

  it("treats an expired session as signed out", () => {
    store.set(KEY, JSON.stringify({ userId: 7, role: "COMMUTER", expiresAt: Date.now() - 1 }));
    expect(getSession()).toBeNull();
  });

  it("signs out sessions saved by the old version, which kept the token in storage", () => {
    store.set(KEY, JSON.stringify({ token: "a.b.c", userId: 7, role: "COMMUTER", expiresAt: Date.now() + 60_000 }));
    expect(getSession()).toBeNull();
  });

  it("ignores garbage", () => {
    store.set(KEY, "{not json");
    expect(getSession()).toBeNull();
  });

  it("extends the session after a refresh", () => {
    saveSession(7, "COMMUTER", 60);
    extendSession(30 * 24 * 3600);
    expect(getSession()!.expiresAt).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
  });

  it("ends the server session when signing out", () => {
    saveSession(7, "COMMUTER", 60);
    clearSession();
    expect(getSession()).toBeNull();
    expect(fetchCalls.some((u) => u.endsWith("/api/auth/session/logout"))).toBe(true);
  });

  it("sends each role to its own home screen", () => {
    expect(homeFor("COMMUTER")).toBe("/");
    expect(homeFor("DRIVER")).toBe("/driver");
    expect(homeFor("OPERATOR")).toBe("/ops");
    expect(homeFor("ADMIN")).toBe("/ops");
  });
});
