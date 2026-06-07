/**
 * Katalog komend bota wyświetlany na stronie „Komendy" w panelu.
 * Nazwy (`name`) muszą dokładnie odpowiadać tym z apps/bot/src/commands/register.ts —
 * bot egzekwuje wyłączenie po nazwie komendy.
 */

export type CommandMeta = {
  name: string;
  desc: string;
};

export type CommandCategory = {
  key: string;
  label: string;
  commands: CommandMeta[];
};

export const COMMAND_CATALOG: CommandCategory[] = [
  {
    key: "user",
    label: "Użytkownik",
    commands: [
      { name: "level", desc: "Pokaż swój aktualny level i XP" },
      { name: "leaderboard", desc: "Pokaż top 10 graczy na serwerze" },
      { name: "profile", desc: "Pokaż profil XP użytkownika" },
      { name: "feedback", desc: "Podziel się opinią o bocie" },
    ],
  },
  {
    key: "config",
    label: "Konfiguracja",
    commands: [
      { name: "cfg_setwelcome", desc: "Ustaw kanał powitań" },
      { name: "cfg_setgoodbye", desc: "Ustaw kanał pożegnań" },
      { name: "cfg_addreward", desc: "Dodaj próg roli za level" },
      { name: "cfg_rolelist", desc: "Pokaż wszystkie progi ról" },
      { name: "cfg_checkrole", desc: "Sprawdź status ról użytkownika" },
      { name: "cfg_syncxp", desc: "Synchronizuj role XP" },
      { name: "cfg_syncverify", desc: "Nadaj rolę niezweryfikowanego" },
      { name: "cfg_addxp", desc: "Dodaj XP sobie lub komuś" },
      { name: "cfg_clear", desc: "Usuń ostatnie wiadomości z kanału" },
      { name: "cfg_setmodlog", desc: "Ustaw kanał logów moderacyjnych" },
      { name: "cfg_setticketrole", desc: "Ustaw rolę supportu ticketów" },
    ],
  },
  {
    key: "moderation",
    label: "Moderacja",
    commands: [
      { name: "mod_warn", desc: "Ostrzeż użytkownika" },
      { name: "mod_warnings", desc: "Pokaż ostrzeżenia użytkownika" },
      { name: "mod_clearwarns", desc: "Usuń ostrzeżenia użytkownika" },
      { name: "mod_mute", desc: "Wycisz użytkownika (timeout)" },
      { name: "mod_unmute", desc: "Usuń wyciszenie użytkownika" },
      { name: "mod_kick", desc: "Wyrzuć użytkownika z serwera" },
      { name: "mod_ban", desc: "Zbanuj użytkownika" },
    ],
  },
  {
    key: "tickets",
    label: "Tickety",
    commands: [
      { name: "ticket_setup", desc: "Utwórz panel ticketów w kanale" },
      { name: "ticket_close", desc: "Zamknij bieżący ticket" },
      { name: "ticket_add", desc: "Dodaj użytkownika do ticketu" },
    ],
  },
  {
    key: "tests",
    label: "Testy",
    commands: [
      { name: "test_welcome", desc: "Testowe powitanie" },
      { name: "test_goodbye", desc: "Testowe pożegnanie" },
    ],
  },
];

/** Wszystkie nazwy komend z katalogu (do walidacji / liczenia). */
export const ALL_COMMAND_NAMES: string[] = COMMAND_CATALOG.flatMap((cat) =>
  cat.commands.map((c) => c.name),
);
