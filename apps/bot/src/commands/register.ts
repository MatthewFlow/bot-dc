import { type Client, REST, Routes, SlashCommandBuilder } from "discord.js";

import { guildId, token } from "../config/env";

export const commands = [
  // ===== USER =====
  new SlashCommandBuilder()
    .setName("level")
    .setDescription("Pokaż swój aktualny level i XP"),

  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Pokaż top 10 graczy na serwerze"),

  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Pokaż profil XP użytkownika")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Użytkownik do sprawdzenia (domyślnie Ty)")
        .setRequired(false),
    ),

  // ===== CONFIG: WELCOME / GOODBYE =====
  new SlashCommandBuilder()
    .setName("cfg_setwelcome")
    .setDescription("Ustaw kanał powitań")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Kanał").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("cfg_setgoodbye")
    .setDescription("Ustaw kanał pożegnań")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Kanał").setRequired(true),
    ),

  // ===== CONFIG: ROLE REWARDS =====
  new SlashCommandBuilder()
    .setName("cfg_addreward")
    .setDescription("Dodaj próg roli za level")
    .addIntegerOption((opt) =>
      opt
        .setName("level")
        .setDescription("Level, od którego rola ma być nadawana")
        .setRequired(true)
        .setMinValue(1),
    )
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("Rola do nadania").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("cfg_rolelist")
    .setDescription("Pokaż wszystkie progi ról"),

  new SlashCommandBuilder()
    .setName("cfg_checkrole")
    .setDescription("Sprawdź status ról użytkownika")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Użytkownik do sprawdzenia (domyślnie Ty)")
        .setRequired(false),
    ),

  // ===== CONFIG: ROLE SYNC =====
  new SlashCommandBuilder()
    .setName("cfg_syncxp")
    .setDescription("Synchronizuj role XP — jeden użytkownik lub wszyscy")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Konkretny użytkownik — bez opcji synchronizuje wszystkich")
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("Maks. liczba użytkowników w trybie masowym (domyślnie 50)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(500),
    ),

  new SlashCommandBuilder()
    .setName("cfg_syncverify")
    .setDescription(
      "Nadaj rolę niezweryfikowanego wszystkim członkom bez roli weryfikacji",
    ),

  // ===== CONFIG: XP =====
  new SlashCommandBuilder()
    .setName("cfg_addxp")
    .setDescription("Dodaj XP sobie lub komuś")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Ile XP dodać")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(5000),
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Komu dodać (domyślnie Ty)").setRequired(false),
    ),

  // ===== CONFIG: MODERATION =====
  new SlashCommandBuilder()
    .setName("cfg_clear")
    .setDescription("Usuń ostatnie wiadomości z kanału")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Ile wiadomości usunąć (1–100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    ),

  new SlashCommandBuilder()
    .setName("cfg_setmodlog")
    .setDescription("Ustaw kanał logów moderacyjnych")
    .addChannelOption((opt) =>
      opt.setName("channel").setDescription("Kanał tekstowy").setRequired(true),
    ),

  // ===== MODERATION =====
  new SlashCommandBuilder()
    .setName("mod_warn")
    .setDescription("Ostrzeż użytkownika")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Powód").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("mod_warnings")
    .setDescription("Pokaż ostrzeżenia użytkownika")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("mod_clearwarns")
    .setDescription("Usuń wszystkie ostrzeżenia użytkownika")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("mod_mute")
    .setDescription("Wycisz użytkownika (Discord timeout)")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("duration")
        .setDescription("Czas w minutach")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Powód").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("mod_unmute")
    .setDescription("Usuń wyciszenie użytkownika")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Powód").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("mod_kick")
    .setDescription("Wyrzuć użytkownika z serwera")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Powód").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("mod_ban")
    .setDescription("Zbanuj użytkownika")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Powód").setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("delete_messages")
        .setDescription("Usuń wiadomości z ostatnich X dni (0–7)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7),
    ),

  // ===== TICKETS =====
  new SlashCommandBuilder()
    .setName("cfg_setticketrole")
    .setDescription("Ustaw rolę supportu dla systemu ticketów")
    .addRoleOption((opt) =>
      opt.setName("role").setDescription("Rola supportu").setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("ticket_setup")
    .setDescription("Utwórz panel ticketów w bieżącym kanale"),

  new SlashCommandBuilder()
    .setName("ticket_close")
    .setDescription("Zamknij bieżący ticket"),

  new SlashCommandBuilder()
    .setName("ticket_add")
    .setDescription("Dodaj użytkownika do bieżącego ticketu")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik do dodania").setRequired(true),
    ),

  // ===== TESTS =====
  new SlashCommandBuilder()
    .setName("test_welcome")
    .setDescription("Testowe powitanie (wysyła na ustawiony kanał)"),

  new SlashCommandBuilder()
    .setName("test_goodbye")
    .setDescription("Testowe pożegnanie (wysyła na ustawiony kanał)"),
].map((c) => c.toJSON());

export async function clearGuildCommands(client: Client) {
  if (!client.user) return;

  const rest = new REST({ version: "10" }).setToken(token);
  // Czyścimy zarówno globalne, jak i (jeśli jest GUILD_ID) gildiowe — żeby nie
  // zostały duplikaty po wcześniejszej rejestracji gildiowej.
  await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
  if (guildId) {
    await rest
      .put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] })
      .catch(() => {});
  }
  console.log("Wyczyszczono komendy ✅");
}

export async function registerCommands(client: Client) {
  if (!client.user) return;

  const rest = new REST({ version: "10" }).setToken(token);
  // Rejestracja GLOBALNA — globalna pula nie podlega dziennemu limitowi per-gildia
  // (kod 30034), a idempotentny PUT tych samych komend nie liczy się jako "create".
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log("Komendy zarejestrowane globalnie ✅");
}
