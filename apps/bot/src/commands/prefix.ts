import type { GuildConfig } from "@jurassic-haven/db";
import type { Message } from "discord.js";

import {
  buildLeaderboardEmbed,
  buildLevelText,
  buildProfileEmbed,
} from "./handlers/user";

/**
 * Komendy klasyczne (prefiksowe). Slash-komendy działają zawsze, niezależnie od
 * prefiksu — tutaj obsługujemy tylko lekki, read-only podzbiór dla wygody
 * użytkowników. Aliasy mapują na kanoniczną nazwę komendy, po której sprawdzamy
 * listę `disabledCommands` (tę samą, co dla slash-komend).
 */
const ALIASES: Record<string, string> = {
  level: "level",
  lvl: "level",
  leaderboard: "leaderboard",
  top: "leaderboard",
  profile: "profile",
  rank: "profile",
};

/**
 * Próbuje obsłużyć wiadomość jako komendę prefiksową.
 * Zwraca `true`, gdy wiadomość była komendą prefiksową (obsłużoną lub wyłączoną),
 * dzięki czemu wywołujący pomija naliczanie XP za tę wiadomość.
 */
export async function handlePrefixCommand(
  message: Message,
  cfg: GuildConfig,
): Promise<boolean> {
  const prefix = cfg.prefix?.trim();
  if (!prefix || !message.guild) return false;
  if (!message.content.startsWith(prefix)) return false;

  const body = message.content.slice(prefix.length).trim();
  if (!body) return false;

  const parts = body.split(/\s+/);
  const rawName = parts[0]?.toLowerCase();
  if (!rawName) return false;

  const name = ALIASES[rawName];
  if (!name) return false; // nie nasza komenda — zostawiamy bez reakcji

  // Komendy wyłączone z panelu są wyłączone również dla prefiksu.
  if (cfg.disabledCommands?.includes(name)) return true;

  const guild = message.guild;

  try {
    if (name === "level") {
      await message.reply(await buildLevelText(guild.id, message.author.id));
    } else if (name === "leaderboard") {
      const embed = await buildLeaderboardEmbed(guild);
      await message.reply(
        embed ? { embeds: [embed] } : "Brak danych XP na tym serwerze.",
      );
    } else if (name === "profile") {
      const target = message.mentions.users.first() ?? message.author;
      const embed = await buildProfileEmbed(guild, target);
      await message.reply({ embeds: [embed] });
    }
  } catch {
    // Brak uprawnień do odpowiedzi / usunięty kanał — nie wywracamy eventu.
  }

  return true;
}
