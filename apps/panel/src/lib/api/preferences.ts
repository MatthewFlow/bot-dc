import type { Lang } from "@/i18n/config";
import { isLang } from "@/i18n/config";

import { API_URL, BASE } from "./core";

/**
 * Preferencje konta. Świadomie NIE używają `fetchWithRetry` — provider języka
 * montuje się też na stronach publicznych (landing), gdzie brak tokenu daje 401;
 * `handleUnauthorized` przekierowałby wtedy na "/". Tu 401/błąd traktujemy jako
 * „brak preferencji" i cicho pomijamy (zapis języka jest best-effort).
 */
export async function getAccountLang(): Promise<Lang | null> {
  try {
    const res = await fetch(`${API_URL}/me/preferences`, BASE);
    if (!res.ok) return null;
    const data = (await res.json()) as { lang?: unknown };
    return isLang(data.lang) ? data.lang : null;
  } catch {
    return null;
  }
}

export async function saveAccountLang(lang: Lang): Promise<void> {
  try {
    await fetch(`${API_URL}/me/preferences`, {
      ...BASE,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang }),
    });
  } catch {
    /* best-effort — localStorage i tak trzyma wybór per-urządzenie */
  }
}
