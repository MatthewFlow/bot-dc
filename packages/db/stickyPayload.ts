import type { DiscordEmbed } from "./embed";
import { isEmbedEmpty, toDiscordEmbed } from "./embed";
import type { StickyMessage } from "./repositories/stickyMessageRepository";

/**
 * Buduje payload wiadomości sticky zależnie od trybu (tekst/embed) — współdzielony
 * przez API (publikacja przy zapisie) i bota (repost). Zwraca `null`, gdy treść
 * jest pusta (nie da się wysłać pustej wiadomości).
 */
export function stickyPayload(
  sticky: StickyMessage,
): { content?: string; embeds?: DiscordEmbed[] } | null {
  if (sticky.mode === "embed" && sticky.embed) {
    const embed = toDiscordEmbed(sticky.embed);
    if (!isEmbedEmpty(embed)) return { embeds: [embed] };
  }
  const content = sticky.content?.trim();
  return content ? { content } : null;
}
