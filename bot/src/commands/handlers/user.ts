import type { ChatInputCommandInteraction } from "discord.js";

import { getXp, levelFromXp, xpToNextLevel } from "../../levels/xpStore";

export async function handleLevel(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const xp = getXp(guildId, interaction.user.id);
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
