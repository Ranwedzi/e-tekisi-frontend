import { afterEach, describe, expect, it, vi } from "vitest";
import { en, type MessageKey } from "./en";
import { zu } from "./zu";
import { st } from "./st";
import { af } from "./af";
import { ts } from "./ts";
import { errorText, format, translate } from "../lib/i18n";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const LOCALES = { zu, st, af, ts };

describe("translations", () => {
  for (const [name, messages] of Object.entries(LOCALES)) {
    describe(name, () => {
      const entries = Object.entries(messages) as [MessageKey, string][];

      it("only uses keys that exist in English", () => {
        expect(entries.map(([k]) => k).filter((k) => !(k in en))).toEqual([]);
      });

      it("keeps every {placeholder} of the English text", () => {
        const wrong = entries.filter(([k, v]) => placeholders(v).join() !== placeholders(en[k]).join()).map(([k]) => k);
        expect(wrong).toEqual([]);
      });

      it("has no empty messages", () => {
        expect(entries.filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
      });

      it("covers every English message", () => {
        // Not required (English shows instead), but every language is complete today.
        expect(Object.keys(en).filter((k) => !(k in messages))).toEqual([]);
      });
    });
  }
});

describe("translate", () => {
  it("fills placeholders", () => {
    expect(translate("en", "home.offerAccepted", { amount: "30.00" })).toBe("Offer accepted. R30.00 paid from your wallet.");
    expect(translate("af", "home.offerAccepted", { amount: "30.00" })).toBe("Aanbod aanvaar. R30.00 uit jou beursie betaal.");
  });

  it("falls back to English for a missing message", async () => {
    const { zu: messages } = await import("./zu");
    const saved = messages["home.requestTaxi"];
    delete messages["home.requestTaxi"];
    try {
      expect(translate("zu", "home.requestTaxi")).toBe("Request Taxi");
    } finally {
      messages["home.requestTaxi"] = saved;
    }
  });

  it("leaves unknown placeholders alone", () => {
    expect(format("R{amount} for {who}", { amount: 5 })).toBe("R5 for {who}");
  });
});

describe("errorText", () => {
  afterEach(() => vi.unstubAllGlobals());

  const asReader = (locale: string) =>
    vi.stubGlobal("window", { localStorage: { getItem: () => locale } });

  it("translates known backend error codes for non-English readers", () => {
    asReader("zu");
    expect(errorText("INSUFFICIENT_FUNDS")).toBe("Ibhalansi yakho iphansi kakhulu.");
  });

  it("leaves English readers with the server's own message", () => {
    asReader("en");
    expect(errorText("INSUFFICIENT_FUNDS")).toBeNull();
  });

  it("ignores codes it has no text for", () => {
    asReader("af");
    expect(errorText("SOMETHING_NEW")).toBeNull();
    expect(errorText(undefined)).toBeNull();
  });
});
