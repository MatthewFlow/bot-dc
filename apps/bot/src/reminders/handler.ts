import { botJobRepository } from "@jurassic-haven/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

import { parseDuration } from "../utils/duration";

const MIN_MS = 10_000; // 10 s
const MAX_MS = 365 * 86_400_000; // 1 rok
const CANCEL_PREFIX = "rem:cancel:";

/** `/remind <time> <message>` — planuje przypomnienie przez kolejkę botJob. */
export async function handleRemind(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const timeStr = interaction.options.getString("time", true);
  const message = interaction.options.getString("message", true).trim();

  const ms = parseDuration(timeStr);
  if (ms === null) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Niepoprawny czas. Przykłady: `10m`, `2h`, `1d`, `1h30m`.",
    });
    return;
  }
  if (ms < MIN_MS) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Minimalny czas to 10 sekund.",
    });
    return;
  }
  if (ms > MAX_MS) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Maksymalny czas to 1 rok.",
    });
    return;
  }

  const runAt = new Date(Date.now() + ms);
  await botJobRepository.create({
    guildId,
    type: "reminder",
    runAt,
    recurrence: "once",
    channelId: interaction.channelId,
    userId: interaction.user.id,
    text: message,
    createdBy: interaction.user.id,
  });

  const unix = Math.floor(runAt.getTime() / 1000);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `⏰ Przypomnę Ci <t:${unix}:R> (<t:${unix}:f>):\n${message}`,
  });
}

/** `/reminders` — lista własnych przypomnień z przyciskami anulowania. */
export async function handleReminders(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId!;
  const reminders = await botJobRepository.getPendingByTypeForUser(
    guildId,
    "reminder",
    interaction.user.id,
    10,
  );

  if (reminders.length === 0) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Nie masz aktywnych przypomnień. Ustaw jedno komendą `/remind`.",
    });
    return;
  }

  const lines = reminders.map((r, i) => {
    const unix = Math.floor(r.runAt.getTime() / 1000);
    return `**${i + 1}.** <t:${unix}:R> — ${r.text ?? "(brak treści)"}`;
  });
  const embed = new EmbedBuilder()
    .setTitle("⏰ Twoje przypomnienia")
    .setDescription(lines.join("\n"))
    .setColor(0xd4a843);

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < reminders.length; i += 5) {
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        reminders.slice(i, i + 5).map((r, j) =>
          new ButtonBuilder()
            .setCustomId(`${CANCEL_PREFIX}${r.id}`)
            .setLabel(`✖ ${i + j + 1}`)
            .setStyle(ButtonStyle.Secondary),
        ),
      ),
    );
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [embed],
    components: rows,
  });
}

/** Klik „✖" przy przypomnieniu — anuluje je (tylko własne). */
export async function handleReminderCancel(
  interaction: ButtonInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const id = interaction.customId.slice(CANCEL_PREFIX.length);
  // Ownership: kasujemy tylko, jeśli to oczekujące przypomnienie tego użytkownika.
  const own = await botJobRepository.getPendingByTypeForUser(
    guildId,
    "reminder",
    interaction.user.id,
    50,
  );
  if (!own.some((r) => r.id === id)) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Nie znaleziono tego przypomnienia (mogło już minąć).",
    });
    return;
  }

  await botJobRepository.delete(id, guildId);
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "✅ Przypomnienie anulowane.",
  });
}
