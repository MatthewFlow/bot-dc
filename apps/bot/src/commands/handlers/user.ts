import { levelFromXp, xpRepository, xpToNextLevel } from "@jurassic-haven/db";
import { EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";

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

export async function handleLeaderboard(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  await interaction.deferReply();

  const entries = await xpRepository.getLeaderboard(guildId, 10);

  if (entries.length === 0) {
    await interaction.editReply("Brak danych XP na tym serwerze.");
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];

  const rows = await Promise.all(
    entries.map(async (entry, idx) => {
      const member = await guild.members.fetch(entry.userId).catch(() => null);
      const name = member?.displayName ?? `<@${entry.userId}>`;
      const level = levelFromXp(entry.xp);
      const prefix = medals[idx] ?? `**${idx + 1}.**`;
      return `${prefix} ${name} — Lv. **${level}** | **${entry.xp} XP**`;
    }),
  );

  const embed = new EmbedBuilder()
    .setTitle("🏆 Leaderboard XP")
    .setDescription(rows.join("\n"))
    .setColor(0xd4a843)
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}