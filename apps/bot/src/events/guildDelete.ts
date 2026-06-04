import type { Guild } from "discord.js";

/**
 * Fired when the bot is removed from a server. We intentionally keep the guild's
 * stored config/data so it is restored if the bot is later re-added.
 */
export function onGuildDelete(guild: Guild) {
  console.log(
    `[guildDelete] Usunięto bota z serwera: ${guild.name ?? "?"} (${guild.id}). Konfiguracja zachowana.`,
  );
}
