import { DEFAULT_LANG, type Lang } from "./config";

/** Wykrywa język z ustawień przeglądarki/systemu (navigator.language). */
export function detectLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  const nav = navigator.language?.toLowerCase() ?? "";
  if (nav.startsWith("pl")) return "pl";
  if (nav.startsWith("en")) return "en";
  return DEFAULT_LANG;
}
