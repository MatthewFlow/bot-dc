import { guildConfigRepository } from "@jurassic-haven/db";
import { EmbedBuilder, type Guild } from "discord.js";

export type TicketEvent = "open" | "close";

const EVENT_META: Record<TicketEvent, { title: string; color: number }> = {
  open: { title: "🎫 Ticket otwarty", color: 0x22c55e },
  close: { title: "🔒 Ticket zamknięty", color: 0x6b7280 },
};

/**
 * Wysyła log zdarzenia ticketu na skonfigurowany kanał logów ticketów.
 * Cicho kończy gdy kanał nie jest ustawiony lub niedostępny.
 */
export async function logTicketEvent(
  guild: Guild,
  event: TicketEvent,
  opts: { threadId: string; userId: string; actorId?: string },
) {
  const cfg = await guildConfigRepository.get(guild.id);
  if (!cfg?.ticketLogChannelId) return;

  const channel =
    guild.channels.cache.get(cfg.ticketLogChannelId) ??
    (await guild.channels.fetch(cfg.ticketLogChannelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  const meta = EVENT_META[event];
  const embed = new EmbedBuilder()
    .setTitle(meta.title)
    .setColor(meta.color)
    .addFields(
      { name: "Wątek", value: `<#${opts.threadId}>`, inline: true },
      { name: "Użytkownik", value: `<@${opts.userId}>`, inline: true },
    )
    .setTimestamp();

  if (event === "close" && opts.actorId) {
    embed.addFields({ name: "Zamknął", value: `<@${opts.actorId}>`, inline: true });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}
