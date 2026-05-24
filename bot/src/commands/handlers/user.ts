import type { ChatInputCommandInteraction } from "discord.js";

import { levelFromXp, xpToNextLevel } from "../../config/xpHelpers";
import { xpRepository } from "../../db/providers/mongoose/providers";

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
