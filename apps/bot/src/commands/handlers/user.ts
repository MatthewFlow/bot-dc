import { levelFromXp, xpToNextLevel } from "@jurassic-haven/db";
import { xpRepository } from "@jurassic-haven/db";
import type { ChatInputCommandInteraction } from "discord.js";

export async function handleLevel(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const xp = await xpRepository.getXp(guildId, interaction.user.id);
  const level = levelFromXp(xp);
  const missing = xpToNextLevel(xp);

  await interaction.reply({
    ephemeral: true,
    content:
      `Twój level: **${level}**\n` +
      `XP: **${xp}**\n` +
      `Do następnego levelu brakuje: **${missing} XP**`,
  });
}
