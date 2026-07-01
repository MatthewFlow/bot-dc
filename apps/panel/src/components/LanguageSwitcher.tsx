"use client";

import { LANGS } from "@/i18n/config";
import { useLang, useT } from "@/i18n/LanguageProvider";

/** Segmentowy przełącznik języka PL | EN (TopBar). Zapis: localStorage + konto. */
export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t.lang.label}
      className="flex h-9 items-center rounded-lg border border-border bg-card/60 p-0.5"
    >
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          title={t.lang[l]}
          className={`flex h-7 items-center rounded-md px-2 text-xs font-semibold uppercase outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40 ${
            lang === l
              ? "bg-primary/15 text-primary"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
