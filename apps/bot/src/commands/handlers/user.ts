import {
  type FeedbackCategory,
  feedbackRepository,
  guildConfigRepository,
  levelFromXp,
  xpRepository,
  xpToNextLevel,
} from "@jurassic-haven/db";
import { type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const FEEDBACK_CATEGORIES = new Set<FeedbackCategory>(["bug", "suggestion", "other"]);

const FEEDBACK_CATEGORY_META: Record<FeedbackCategory, { label: string; color: number }> =
  {
    bug: { label: "🐛 Błąd", color: 0xed4245 },
    suggestion: { label: "💡 Sugestia", color: 0xd4a843 },
    other: { label: "💬 Inne", color: 0x5865f2 },
  };

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
  const message = interaction.options.getString("message", true).trim();
  if (!message) {
    await interaction.reply({
      ephemeral: true,
      content: "Treść opinii nie może być pusta.",
    });
    return;
  }

  const rawCategory = interaction.options.getString("category") ?? "other";
  const category: FeedbackCategory = FEEDBACK_CATEGORIES.has(
    rawCategory as FeedbackCategory,
  )
    ? (rawCategory as FeedbackCategory)
    : "other";
  const rating = interaction.options.getInteger("rating") ?? undefined;
  const trimmed = message.slice(0, 2000);

  await feedbackRepository.add({
    userId: interaction.user.id,
    username: interaction.user.username,
    guildId: interaction.guildId ?? undefined,
    category,
    message: trimmed,
    rating,
  });

  // Jeśli serwer ma ustawiony kanał feedbacku — opublikuj zgłoszenie jako embed.
  const guild = interaction.guild;
  if (guild) {
    const cfg = await guildConfigRepository.get(guild.id);
    if (cfg?.feedbackChannelId) {
      const meta = FEEDBACK_CATEGORY_META[category];
      const embed = new EmbedBuilder()
        .setColor(meta.color)
        .setAuthor({
          name: interaction.user.tag,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle(meta.label)
        .setDescription(trimmed)
        .setTimestamp();
      if (rating) {
        embed.addFields({
          name: "Ocena",
          value: `${"⭐".repeat(rating)} ${rating}/5`,
          inline: true,
        });
      }
      const channel = await guild.channels.fetch(cfg.feedbackChannelId).catch(() => null);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }

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
