"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getAccountLang, saveAccountLang } from "@/lib/api/preferences";

import { DEFAULT_LANG, isLang, type Lang, LANG_STORAGE_KEY } from "./config";
import { detectLang } from "./detectLang";
import { en } from "./messages/en";
import { type Messages, pl } from "./messages/pl";

const DICTS: Record<Lang, Messages> = { pl, en };

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Messages;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStored(): Lang | null {
  try {
    const raw = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStored(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start z DEFAULT_LANG na serwerze i przy pierwszym renderze klienta (zgodność
  // hydracji) — realny język ustalamy po montażu w useEffect.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  const applyLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);

  useEffect(() => {
    // 1) Natychmiast: zapamiętany wybór (per-urządzenie) albo detekcja systemu.
    const stored = readStored();
    const initial = stored ?? detectLang();
    applyLang(initial);

    // 2) Pogodzenie z kontem (źródło prawdy między urządzeniami). Konto wygrywa;
    //    gdy user nie ma jeszcze zapisanego wyboru lokalnie, utrwalamy wartość konta.
    let cancelled = false;
    void getAccountLang().then((accountLang) => {
      if (cancelled || !accountLang) return;
      if (accountLang !== initial) {
        applyLang(accountLang);
        writeStored(accountLang);
      } else if (!stored) {
        writeStored(accountLang);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [applyLang]);

  const setLang = useCallback(
    (next: Lang) => {
      applyLang(next);
      writeStored(next);
      void saveAccountLang(next); // best-effort, przypina do konta
    },
    [applyLang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: DICTS[lang] }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageContext(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useT/useLang muszą być wewnątrz <LanguageProvider>");
  return ctx;
}

/** Słownik bieżącego języka (typowany — autouzupełnianie kluczy). */
export function useT(): Messages {
  return useLanguageContext().t;
}

/** Bieżący język + setter (do przełącznika języka). */
export function useLang(): { lang: Lang; setLang: (lang: Lang) => void } {
  const { lang, setLang } = useLanguageContext();
  return { lang, setLang };
}
