/** Języki obsługiwane przez panel. Lustro `AppLang` z @jurassic-haven/db, ale
 *  zdefiniowane lokalnie — panel świadomie NIE importuje warstwy db. */
export type Lang = "pl" | "en";

export const LANGS: readonly Lang[] = ["pl", "en"];
export const DEFAULT_LANG: Lang = "pl";

/** Klucz cache'a wybranego języka w localStorage (szybki odczyt przed siecią). */
export const LANG_STORAGE_KEY = "jh_lang";

export function isLang(value: unknown): value is Lang {
  return value === "pl" || value === "en";
}
