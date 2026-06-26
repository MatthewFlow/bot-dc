import { stickyMessageRepository, stickyPayload } from "@jurassic-haven/db";
import type { Client, Message } from "discord.js";

import { getGuildStickies } from "../utils/stickyCache";

/** Po nowej wiadomości czekamy tyle ciszy, zanim przesuniemy sticky na dół. */
const DEBOUNCE_MS = 5_000;

// channelId -> timer repostu (debounce: burst wiadomości = jeden repost).
const timers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Wywoływane na każdą (ludzką) wiadomość. Jeśli kanał ma aktywny sticky, planuje
 * repost po `DEBOUNCE_MS` ciszy. Guard na własne wiadomości bota jest kluczowy —
 * repost sam tworzy `messageCreate` i bez tego powstałaby pętla.
 */
export async function handleStickyMessage(message: Message): Promise<void> {
  if (message.author.bot || !message.guildId) return;

  const stickies = await getGuildStickies(message.guildId);
  const sticky = stickies.find((s) => s.channelId === message.channelId && s.enabled);
  if (!sticky) return;

  const key = message.channelId;
  const pending = timers.get(key);
  if (pending) clearTimeout(pending);

  const guildId = message.guildId;
  const timer = setTimeout(() => {
    timers.delete(key);
    void repostSticky(message.client, guildId, key);
  }, DEBOUNCE_MS);
  timer.unref?.();
  timers.set(key, timer);
}

/** Kasuje poprzednią kopię sticky i wysyła nową na dół kanału. */
async function repostSticky(
  client: Client,
  guildId: string,
  channelId: string,
): Promise<void> {
  // Świeży odczyt — config/lastMessageId mogły się zmienić w oknie debounce.
  const sticky = await stickyMessageRepository.getByChannel(guildId, channelId);
  if (!sticky || !sticky.enabled) return;

  const payload = stickyPayload(sticky);
  if (!payload) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  if (sticky.lastMessageId) {
    await channel.messages.delete(sticky.lastMessageId).catch(() => {});
  }
  const sent = await channel.send(payload).catch(() => null);
  await stickyMessageRepository.setLastMessageId(sticky.id, sent?.id ?? null);
}
