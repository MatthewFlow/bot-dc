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
  if (!guildId) {
    console.log("Brak GUILD_ID w .env – nie czyszczę komend");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
  console.log("Wyczyszczono komendy na serwerze ✅");
}

export async function registerCommands(client: Client) {
  if (!client.user) return;
  if (!guildId) {
    console.log("Brak GUILD_ID w .env – pomijam rejestrację komend");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
    body: commands,
  });
  console.log("Komendy zarejestrowane na serwerze ✅");
}
