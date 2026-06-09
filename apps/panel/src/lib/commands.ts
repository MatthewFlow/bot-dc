/**
 * Katalog komend bota wyświetlany na stronie „Komendy" w panelu.
 * Nazwy (`name`) muszą dokładnie odpowiadać tym z apps/bot/src/commands/register.ts —
 * bot egzekwuje wyłączenie po nazwie komendy.
 */

export type CommandMeta = {
  name: string;
  desc: string;
  /** Syntax hint shown in the panel. <required> [optional] */
  usage?: string;
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
      {
        name: "level",
        desc: "Pokaż swój aktualny level i XP",
        usage: "/level",
      },
      {
        name: "leaderboard",
        desc: "Pokaż top 10 graczy na serwerze",
        usage: "/leaderboard",
      },
      {
        name: "profile",
        desc: "Pokaż profil XP użytkownika",
        usage: "/profile [user]",
      },
      {
        name: "feedback",
        desc: "Podziel się opinią o bocie",
        usage: "/feedback <message> [category] [rating]",
      },
    ],
  },
  {
    key: "config",
    label: "Konfiguracja",
    commands: [
      {
        name: "cfg_setwelcome",
        desc: "Ustaw kanał powitań",
        usage: "/cfg_setwelcome <channel>",
      },
      {
        name: "cfg_setgoodbye",
        desc: "Ustaw kanał pożegnań",
        usage: "/cfg_setgoodbye <channel>",
      },
      {
        name: "cfg_addreward",
        desc: "Dodaj próg roli za level",
        usage: "/cfg_addreward <level> <role>",
      },
      {
        name: "cfg_rolelist",
        desc: "Pokaż wszystkie progi ról",
        usage: "/cfg_rolelist",
      },
      {
        name: "cfg_checkrole",
        desc: "Sprawdź status ról użytkownika",
        usage: "/cfg_checkrole [user]",
      },
      {
        name: "cfg_syncxp",
        desc: "Synchronizuj role XP",
        usage: "/cfg_syncxp [user] [limit]",
      },
      {
        name: "cfg_syncverify",
        desc: "Nadaj rolę niezweryfikowanego",
        usage: "/cfg_syncverify",
      },
      {
        name: "cfg_addxp",
        desc: "Dodaj XP sobie lub komuś",
        usage: "/cfg_addxp <amount> [user]",
      },
      {
        name: "cfg_clear",
        desc: "Usuń ostatnie wiadomości z kanału",
        usage: "/cfg_clear <amount>",
      },
      {
        name: "cfg_setmodlog",
        desc: "Ustaw kanał logów moderacyjnych",
        usage: "/cfg_setmodlog <channel>",
      },
      {
        name: "cfg_setticketrole",
        desc: "Ustaw rolę supportu ticketów",
        usage: "/cfg_setticketrole <role>",
      },
    ],
  },
  {
    key: "moderation",
    label: "Moderacja",
    commands: [
      {
        name: "mod_warn",
        desc: "Ostrzeż użytkownika",
        usage: "/mod_warn <user> [reason]",
      },
      {
        name: "mod_warnings",
        desc: "Pokaż ostrzeżenia użytkownika",
        usage: "/mod_warnings <user>",
      },
      {
        name: "mod_clearwarns",
        desc: "Usuń ostrzeżenia użytkownika",
        usage: "/mod_clearwarns <user>",
      },
      {
        name: "mod_mute",
        desc: "Wycisz użytkownika (timeout)",
        usage: "/mod_mute <user> <duration> [reason]",
      },
      {
        name: "mod_unmute",
        desc: "Usuń wyciszenie użytkownika",
        usage: "/mod_unmute <user> [reason]",
      },
      {
        name: "mod_kick",
        desc: "Wyrzuć użytkownika z serwera",
        usage: "/mod_kick <user> [reason]",
      },
      {
        name: "mod_ban",
        desc: "Zbanuj użytkownika",
        usage: "/mod_ban <user> [reason] [delete_messages]",
      },
    ],
  },
  {
    key: "tickets",
    label: "Tickety",
    commands: [
      {
        name: "ticket_setup",
        desc: "Utwórz panel ticketów w kanale",
        usage: "/ticket_setup",
      },
      {
        name: "ticket_close",
        desc: "Zamknij bieżący ticket",
        usage: "/ticket_close",
      },
      {
        name: "ticket_add",
        desc: "Dodaj użytkownika do ticketu",
        usage: "/ticket_add <user>",
      },
      {
        name: "ticket_delete",
        desc: "Usuń ticket po ID wątku",
        usage: "/ticket_delete <id>",
      },
    ],
  },
  {
    key: "tests",
    label: "Testy",
    commands: [
      {
        name: "test_welcome",
        desc: "Testowe powitanie",
        usage: "/test_welcome",
      },
      {
        name: "test_goodbye",
        desc: "Testowe pożegnanie",
        usage: "/test_goodbye",
      },
    ],
  },
];

/** Wszystkie nazwy komend z katalogu (do walidacji / liczenia). */
export const ALL_COMMAND_NAMES: string[] = COMMAND_CATALOG.flatMap((cat) =>
  cat.commands.map((c) => c.name),
);
