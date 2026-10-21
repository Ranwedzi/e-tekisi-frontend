"use client";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { en, type MessageKey } from "../i18n/en";
import { zu } from "../i18n/zu";
import { st } from "../i18n/st";
import { af } from "../i18n/af";
import { ts } from "../i18n/ts";

// The app in the commuter's or driver's own language. English is the source
// and the fallback for anything not yet translated. The choice is kept per
// device; the first visit follows the browser's language when we have it.
// (The operations console stays in English.)

export const LOCALES = {
  en: "English",
  zu: "isiZulu",
  st: "Sesotho",
  af: "Afrikaans",
  ts: "Xitsonga",
} as const;
export type Locale = keyof typeof LOCALES;

export type Messages = Partial<Record<MessageKey, string>>;
const MESSAGES: Record<Locale, Messages> = { en, zu, st, af, ts };

/** BCP 47 tags for <html lang> and date/number formatting. */
const TAGS: Record<Locale, string> = { en: "en-ZA", zu: "zu-ZA", st: "st-ZA", af: "af-ZA", ts: "ts-ZA" };

const KEY = "etekisi_locale";
const CHANGE_EVENT = "etekisi-locale-change";

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && v in LOCALES;
}

function detect(): Locale {
  if (typeof navigator === "undefined") return "en";
  for (const lang of navigator.languages ?? [navigator.language]) {
    const base = lang.toLowerCase().split("-")[0];
    // Northern Sotho (nso) and Setswana (tn) readers usually follow Sesotho best.
    const mapped = base === "nso" || base === "tn" ? "st" : base;
    if (isLocale(mapped)) return mapped;
  }
  return "en";
}

function read(): Locale {
  try {
    const v = window.localStorage.getItem(KEY);
    if (isLocale(v)) return v;
  } catch {
    // storage blocked
  }
  return detect();
}

export function setLocale(locale: Locale) {
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
    // storage blocked: the choice lasts until the page reloads
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Fills {name} placeholders. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  return format(MESSAGES[locale][key] ?? en[key], vars);
}

export type T = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** The chosen language right now, for code outside components (English on the server). */
export function currentLocale(): Locale {
  return typeof window === "undefined" ? "en" : read();
}

/** Like t(), outside React. */
export function translateNow(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(currentLocale(), key, vars);
}

/** The translation of a backend error code, if we have one and the reader isn't using English. */
export function errorText(code: string | undefined): string | null {
  if (!code) return null;
  const locale = currentLocale();
  const key = `error.${code}`;
  if (locale === "en" || !(key in en)) return null;
  return translate(locale, key as MessageKey);
}

/** The current language (English while rendering on the server) and its translate function. */
export function useLocale(): { locale: Locale; t: T; tag: string } {
  const locale = useSyncExternalStore(subscribe, read, () => "en" as Locale);
  const t = useCallback<T>((key, vars) => translate(locale, key, vars), [locale]);
  return { locale, t, tag: TAGS[locale] };
}

export function useT(): T {
  return useLocale().t;
}

/** Keeps <html lang> in step with the chosen language (screen readers, hyphenation). */
export function HtmlLang() {
  const { tag } = useLocale();
  useEffect(() => {
    document.documentElement.lang = tag;
  }, [tag]);
  return null;
}

/** Language picker: a native select, so it works with any screen reader and on any phone. */
export function LanguagePicker({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { locale, t } = useLocale();
  return (
    <label className={`flex items-center gap-2 text-xs font-black uppercase ${dark ? "text-gray-400" : "text-gray-500"} ${className}`}>
      <span>{t("language.label")}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={`rounded-xl px-3 py-2 font-bold normal-case border ${dark ? "bg-[#262626] border-[#333] text-white" : "bg-white border-gray-200 text-gray-800"}`}
      >
        {(Object.keys(LOCALES) as Locale[]).map((l) => (
          <option key={l} value={l} lang={TAGS[l]}>
            {LOCALES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
