/**
 * Słownik PL — źródło prawdy kształtu tłumaczeń. `Messages` = typeof tego
 * obiektu; `en.ts` jest typowany na `Messages`, więc brak/nadmiar klucza w EN
 * to błąd kompilacji (parytet wymuszony przez TypeScript, bez testu runtime).
 *
 * Faza A: pokrywa shell aplikacji (nawigacja, TopBar, sidebar, command palette).
 * Treść podstron dochodzi sekcjami w Fazie B.
 */
export const pl = {
  common: {
    soon: "wkrótce",
    search: "Szukaj…",
    searchPages: "Szukaj stron i akcji…",
    noResults: "Brak wyników.",
    logout: "Wyloguj",
    changeServer: "Zmień serwer",
    discordBot: "Discord Bot",
  },
  topbar: {
    openMenu: "Otwórz menu",
    closeMenu: "Zamknij menu",
    ownerPanel: "Panel właściciela — wszystkie serwery bota",
    searchHint: "Szukaj i nawiguj (Ctrl/⌘ K)",
    searchAria: "Otwórz wyszukiwarkę poleceń",
    logout: "Wyloguj",
  },
  lang: {
    label: "Język",
    pl: "Polski",
    en: "English",
  },
  palette: {
    label: "Wyszukiwarka poleceń",
    pages: "Strony",
    actions: "Akcje",
    ownerPanel: "Panel właściciela",
    open: "otwórz",
    close: "zamknij",
  },
  nav: {
    groups: {
      onboarding: "Onboarding",
      community: "Społeczność",
      security: "Bezpieczeństwo",
      system: "System",
    },
    items: {
      overview: { label: "Dashboard", desc: "Przegląd serwera" },
      feedback: { label: "Feedback", desc: "Podziel się uwagami i sugestiami" },
      welcome: { label: "Welcome / Goodbye", desc: "Kanały i wiadomości powitalne" },
      autorole: { label: "Auto-role", desc: "Rola nadawana po wejściu" },
      roles: {
        label: "Self-Roles",
        desc: "Role do samodzielnego wzięcia (przyciski / reakcje)",
      },
      levels: { label: "Levelowanie", desc: "System XP, poziomów i nagród" },
      tickets: { label: "Tickety", desc: "Obsługa zgłoszeń użytkowników" },
      announce: { label: "Ogłoszenia", desc: "Wyślij lub zaplanuj wiadomość embed" },
      sticky: { label: "Sticky", desc: "Przypięta wiadomość trzymana na dole kanału" },
      autovoice: {
        label: "Kanały głosowe",
        desc: "Auto-kanały: wejście tworzy własny kanał głosowy",
      },
      translation: {
        label: "Tłumaczenia",
        desc: "Auto-tłumaczenie wiadomości ze śledzonego kanału",
      },
      giveaways: { label: "Giveawaye", desc: "Konkursy z losowaniem nagród" },
      moderation: { label: "Moderacja", desc: "Ostrzeżenia, bany, logi akcji" },
      automod: { label: "Auto-moderacja", desc: "Filtry spamu, linków i słów" },
      serverlog: { label: "Logi serwera", desc: "Logi wiadomości, wejść i ról" },
      commands: { label: "Komendy", desc: "Włączanie i wyłączanie komend bota" },
      settings: { label: "Ustawienia", desc: "Rola admina i kanał logów moderacji" },
      gameserver: {
        label: "Serwer gry",
        desc: "Zarządzanie serwerem The Isle: Evrima (RCON)",
      },
    },
  },
};

// Uwaga: BEZ `as const` — chcemy, by wartości miały typ `string` (EN może mieć
// inny tekst), a klucze i tak pozostają literałami (działa `NavItemKey` itd.).
export type Messages = typeof pl;
/** Klucze pozycji nawigacji (do `key` w nav.ts). */
export type NavItemKey = keyof Messages["nav"]["items"];
/** Klucze sekcji nawigacji (do `key` w nav.ts). */
export type NavGroupKey = keyof Messages["nav"]["groups"];
