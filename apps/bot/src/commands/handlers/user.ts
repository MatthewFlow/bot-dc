import { levelFromXp, xpRepository, xpToNextLevel } from "@jurassic-haven/db";
import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { parseFeedbackCategory, submitFeedback } from "../../feedback/feedback";

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

export async function handleFeedback(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild;
  if (!guild) {
    await interaction.reply({
      ephemeral: true,
      content: "Ta komenda działa tylko na serwerze.",
    });
    return;
  }

  const message = interaction.options.getString("message", true).trim();
  if (!message) {
    await interaction.reply({
      ephemeral: true,
      content: "Treść opinii nie może być pusta.",
    });
    return;
  }

  const category = parseFeedbackCategory(interaction.options.getString("category"));
  const rating = interaction.options.getInteger("rating") ?? undefined;

  await submitFeedback({ guild, user: interaction.user, category, message, rating });

  await interaction.reply({
    ephemeral: true,
    content:
      "✅ Dziękujemy za opinię! Twoje zgłoszenie zostało zapisane. " +
      "Pełną historię swoich zgłoszeń zobaczysz w panelu na stronie **Feedback**.",
  });
}

export async function handleProfile(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const targetUser = interaction.options.getUser("user") ?? interaction.user;

  await interaction.deferReply();

  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  const xp = await xpRepository.getXp(guildId, targetUser.id);
  const level = levelFromXp(xp);
  const missing = xpToNextLevel(xp);

  const leaderboard = await xpRepository.getLeaderboard(guildId, 100);
  const idx = leaderboard.findIndex((e) => e.userId === targetUser.id);
  const position = idx >= 0 ? `#${idx + 1}` : "poza top 100";

  const displayName = member?.displayName ?? targetUser.username;
  const avatarUrl =
    member?.displayAvatarURL({ size: 256 }) ?? targetUser.displayAvatarURL({ size: 256 });

  const embed = new EmbedBuilder()
    .setTitle(`Profil — ${displayName}`)
    .setThumbnail(avatarUrl)
    .setColor(0xd4a843)
    .addFields(
      { name: "Level", value: `**${level}**`, inline: true },
      { name: "XP", value: `**${xp}**`, inline: true },
      { name: "Pozycja", value: `**${position}**`, inline: true },
      { name: "Do następnego levelu", value: `**${missing} XP**`, inline: false },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
