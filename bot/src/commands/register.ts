import { type Client, REST, Routes, SlashCommandBuilder } from "discord.js";

import { guildId, token } from "../config/env";

// Komendy:
// - cfg_* = konfiguracja (admin)
// - test_* = testy
// - level = user
export const commands = [
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

  // ===== CONFIG: AUTO ROLE =====
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
    .setName("cfg_listrewards")
    .setDescription("Pokaż wszystkie progi ról"),

  new SlashCommandBuilder()
    .setName("cfg_checkrole")
    .setDescription("Sprawdź role progresji użytkownika")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Użytkownik do sprawdzenia (domyślnie Ty)")
        .setRequired(false),
    ),

  // ===== CONFIG: ROLE SYNC =====
  new SlashCommandBuilder()
    .setName("cfg_syncrole")
    .setDescription("Wymuś synchronizację roli progresji (1 użytkownik)")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Użytkownik (domyślnie Ty)").setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("cfg_syncall")
    .setDescription("Synchronizuj role progresji dla wielu użytkowników (admin)")
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("Ilu użytkowników max zsynchronizować (domyślnie 50)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(500),
    ),

  // ===== TESTS =====
  new SlashCommandBuilder()
    .setName("test_welcome")
    .setDescription("Testowe powitanie (wysyła na ustawiony kanał)"),

  new SlashCommandBuilder()
    .setName("test_goodbye")
    .setDescription("Testowe pożegnanie (wysyła na ustawiony kanał)"),

  new SlashCommandBuilder()
    .setName("test_addxp")
    .setDescription("Dodaj XP sobie lub komuś (test)")
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

  // ===== USER =====
  new SlashCommandBuilder()
    .setName("level")
    .setDescription("Pokaż swój aktualny level i XP"),
].map((c) => c.toJSON());

// ===== CLEAR COMMANDS (DEBUG) =====
export async function clearGuildCommands(client: Client) {
  if (!client.user) return;
  if (!guildId) {
    console.log("Brak GUILD_ID w .env – nie czyszczę komend");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
    body: [],
  });

  console.log("Wyczyszczono komendy na serwerze ✅");
}

// ===== REGISTER COMMANDS =====
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
