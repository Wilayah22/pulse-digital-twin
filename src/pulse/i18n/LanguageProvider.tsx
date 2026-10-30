"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { Lang } from "../engine";

interface LanguageValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  /** Pick the Arabic or English text for the current language. */
  t: (ar: string, en: string) => string;
  /** Intl locale with Latin digits, matching the dashboard's number style. */
  locale: string;
  /** "Before → after" arrow pointing in the reading direction. */
  arrow: string;
}

const STORAGE_KEY = "pulse.lang";

const LanguageContext = createContext<LanguageValue>({
  lang: "ar",
  dir: "rtl",
  setLang: () => {},
  t: (ar) => ar,
  locale: "ar-SA-u-nu-latn-ca-gregory",
  arrow: "←",
});

const LANG_EVENT = "pulse-lang";
/** Fallback when localStorage is blocked, so switching still works for this visit. */
let memoryLang: Lang | null = null;

function readLang(): Lang {
  if (memoryLang) return memoryLang;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(LANG_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LANG_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // The static HTML is Arabic; the saved choice is applied right after hydration without a mismatch.
  const lang = useSyncExternalStore(subscribe, readLang, () => "ar" as Lang);

  const setLang = useCallback((l: Lang) => {
    memoryLang = l;
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Storage unavailable (private mode): fall through; the event below still updates this tab.
    }
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      t: (ar, en) => (lang === "en" ? en : ar),
      locale: lang === "en" ? "en-GB" : "ar-SA-u-nu-latn-ca-gregory",
      arrow: lang === "en" ? "→" : "←",
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="latin flex h-10 items-center rounded-full bg-pn-bg px-3 text-xs font-bold text-pn-navy ring-1 ring-pn-line hover:bg-pn-line/60"
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {lang === "ar" ? "EN" : "عربي"}
    </button>
  );
}
