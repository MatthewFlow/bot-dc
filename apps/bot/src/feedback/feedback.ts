import {
  type FeedbackCategory,
  feedbackRepository,
  guildConfigRepository,
} from "@jurassic-haven/db";
import {
  ActionRowBuilder,
  type ButtonInteraction,
  EmbedBuilder,
  type Guild,
  ModalBuilder,
  type ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
  type User,
} from "discord.js";

export const FEEDBACK_CATEGORY_META: Record<
  FeedbackCategory,
  { label: string; color: number }
> = {
  bug: { label: "🐛 Błąd", color: 0xed4245 },
  suggestion: { label: "💡 Sugestia", color: 0xd4a843 },
  other: { label: "💬 Inne", color: 0x5865f2 },
};

/** Mapuje dowolny tekst/wartość na kategorię (działa dla choice'ów i wolnego tekstu). */
export function parseFeedbackCategory(raw: string | null | undefined): FeedbackCategory {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "other";
  if (["bug", "błąd", "blad", "error", "bł"].some((k) => s.includes(k))) return "bug";
  if (["sug", "pomy", "feature", "propo", "idea"].some((k) => s.includes(k)))
    return "suggestion";
  return "other";
}

/**
 * Zapisuje zgłoszenie i — jeśli serwer ma ustawiony kanał feedbacku — publikuje je
 * jako embed. Wspólne dla komendy /feedback i panelu z przyciskiem.
 */
export async function submitFeedback(opts: {
  guild: Guild;
  user: User;
  category: FeedbackCategory;
  message: string;
  rating?: number;
}): Promise<void> {
  const { guild, user, category, rating } = opts;
  const message = opts.message.slice(0, 2000);

  await feedbackRepository.add({
    userId: user.id,
    username: user.username,
    guildId: guild.id,
    category,
    message,
    rating,
  });

  const cfg = await guildConfigRepository.get(guild.id);
  if (!cfg?.feedbackChannelId) return;

  const meta = FEEDBACK_CATEGORY_META[category];
  const embed = new EmbedBuilder()
    .setColor(meta.color)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setTitle(meta.label)
    .setDescription(message)
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

/** Klik „Podziel się opinią" na panelu → modal. */
export async function showFeedbackModal(interaction: ButtonInteraction): Promise<void> {
  const message = new TextInputBuilder()
    .setCustomId("fb_message")
    .setLabel("Twoja opinia")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(2000)
    .setPlaceholder("Pomysł, uwaga lub opis błędu…");

  const category = new TextInputBuilder()
    .setCustomId("fb_category")
    .setLabel("Kategoria: błąd / sugestia / inne")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(20)
    .setPlaceholder("sugestia");

  const rating = new TextInputBuilder()
    .setCustomId("fb_rating")
    .setLabel("Ocena 1–5 (opcjonalnie)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(1)
    .setPlaceholder("5");

  const modal = new ModalBuilder()
    .setCustomId("feedback_submit")
    .setTitle("Podziel się opinią")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(message),
      new ActionRowBuilder<TextInputBuilder>().addComponents(category),
      new ActionRowBuilder<TextInputBuilder>().addComponents(rating),
    );

  await interaction.showModal(modal);
}

/** Submit modala panelu feedbacku. */
export async function handleFeedbackSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply("To działa tylko na serwerze.");
    return;
  }

  const message = interaction.fields.getTextInputValue("fb_message").trim();
  if (!message) {
    await interaction.editReply("Treść opinii nie może być pusta.");
    return;
  }

  const category = parseFeedbackCategory(
    interaction.fields.getTextInputValue("fb_category"),
  );
  const ratingNum = Number(interaction.fields.getTextInputValue("fb_rating"));
  const rating =
    Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5
      ? ratingNum
      : undefined;

  await submitFeedback({ guild, user: interaction.user, category, message, rating });

  await interaction.editReply(
    "✅ Dziękujemy za opinię! Twoje zgłoszenie zostało zapisane.",
  );
}
