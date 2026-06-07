import type { EmbedConfig } from "@/lib/api";

/** Liczba dziesiętna koloru → hex „#RRGGBB". */
export function numberToHex(n: number): string {
  return `#${Math.max(0, Math.min(0xffffff, n)).toString(16).padStart(6, "0")}`;
}

/** Hex „#RRGGBB" → liczba dziesiętna; undefined dla niepoprawnego formatu. */
export function hexToNumber(hex: string): number | undefined {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m ? parseInt(m[1], 16) : undefined;
}

export const DEFAULT_EMBED_COLOR = 0x5865f2;

/** Zmienne dostępne w embedach powitań/pożegnań (kontekst członka). */
export const WELCOME_VARS = [
  "{user}",
  "{username}",
  "{server}",
  "{member_count}",
  "{avatar}",
];

/** Zmienne dostępne w statycznym panelu ticketów (kontekst serwera). */
export const TICKET_VARS = ["{server}", "{member_count}"];

/** Zmienne dostępne w embedzie awansu (level-up). */
export const LEVEL_VARS = [
  "{user}",
  "{username}",
  "{server}",
  "{level}",
  "{role}",
  "{avatar}",
];

/** Opisy zmiennych (do listy „Dostępne zmienne"). */
export const VARIABLE_INFO: Record<string, string> = {
  "{user}": "Oznaczenie użytkownika",
  "{username}": "Nazwa użytkownika",
  "{server}": "Nazwa serwera",
  "{member_count}": "Liczba członków",
  "{avatar}": "Awatar użytkownika (URL)",
  "{level}": "Nowy poziom",
  "{role}": "Nadana ranga (jeśli jest)",
};

/** Podgląd podstawienia zmiennych szablonu wartościami przykładowymi. */
export function previewReplacer(template: string): string {
  return template
    .replace(/{user}/g, "@nowy_użytkownik")
    .replace(/{username}/g, "nowy_użytkownik")
    .replace(/{server}/g, "Jurassic Haven")
    .replace(/{member_count}/g, "1 337")
    .replace(/{level}/g, "5")
    .replace(/{role}/g, "@Weteran")
    .replace(/{avatar}/g, "https://cdn.discordapp.com/embed/avatars/0.png");
}

/** Czy embed ma jakąkolwiek widoczną treść (do walidacji przed wysyłką). */
export function isEmbedEmpty(e: EmbedConfig): boolean {
  return (
    !e.title?.trim() &&
    !e.description?.trim() &&
    !e.authorName?.trim() &&
    !e.footerText?.trim() &&
    !e.imageUrl?.trim() &&
    !(e.fields ?? []).some((f) => f.name?.trim() && f.value?.trim())
  );
}
