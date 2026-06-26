import {
  type Giveaway,
  giveawayEmbed,
  giveawayRepository,
  pickWinners,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type Client } from "discord.js";

/** Wyłączony przycisk „Zakończony" na zakończonej wiadomości giveawaya. */
function endedButton(id: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:${id}`)
      .setLabel("Zakończony")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
  );
}

/**
 * Kończy giveaway: losuje zwycięzców, zapisuje wynik (status `ended`), edytuje
 * oryginalną wiadomość na embed „zakończony" + wyłączony przycisk i ogłasza
 * zwycięzców na kanale. Najpierw zapis statusu (idempotencja — sweep nie weźmie
 * go ponownie), potem efekty na Discordzie (best-effort).
 */
export async function endGiveaway(client: Client, giveaway: Giveaway): Promise<void> {
  const winners = pickWinners(giveaway.entrants, giveaway.winnerCount);
  const ended = (await giveawayRepository.setEnded(giveaway.id, winners)) ?? {
    ...giveaway,
    status: "ended" as const,
    winners,
  };

  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  if (giveaway.messageId) {
    const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    await msg
      ?.edit({
        embeds: [toDiscordEmbed(giveawayEmbed(ended))],
        components: [endedButton(giveaway.id)],
      })
      .catch(() => {});
  }

  const text = winners.length
    ? `🎉 Giveaway **${giveaway.prize}** zakończony!\nGratulacje: ${winners
        .map((wid) => `<@${wid}>`)
        .join(", ")}`
    : `🎉 Giveaway **${giveaway.prize}** zakończony — nikt nie dołączył, brak zwycięzców.`;

  await channel
    .send({ content: text, allowedMentions: { users: winners } })
    .catch(() => {});
}
