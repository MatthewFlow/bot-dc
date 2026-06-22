import { EmbedBuilder, type Message } from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";
import { translate } from "./deepl";

/** Czytelna etykieta języka docelowego (kod DeepL → nazwa + flaga). */
const LANG_LABEL: Record<string, string> = {
  PL: "🇵🇱 Tłumaczenie",
  "EN-GB": "🇬🇧 Translation",
  DE: "🇩🇪 Übersetzung",
  ES: "🇪🇸 Traducción",
  FR: "🇫🇷 Traduction",
};

/**
 * Auto-tłumaczenie: gdy na skonfigurowanym kanale-źródle pojawi się wiadomość
 * (zwykle webhook śledzonego kanału ogłoszeń), bot tłumaczy jej treść i embedy
 * i odpowiada embedem pod oryginałem. Best-effort — nigdy nie rzuca.
 *
 * Osobny listener (jak server-log), więc działa też dla wiadomości botów/webhooków,
 * które główny `messageCreate` pomija. Guard na własne ID zapobiega pętli.
 */
export async function onTranslateMessage(message: Message): Promise<void> {
  try {
    if (!message.guildId) return;
    if (message.author.id === message.client.user?.id) return; // nigdy własny embed

    const cfg = await getCachedGuildConfig(message.guildId);
    const t = cfg?.translation;
    if (!t?.enabled || !t.sourceChannelId) return;
    if (message.channelId !== t.sourceChannelId) return;

    // Zbierz tekst źródłowy: treść + tytuły/opisy embedów.
    const parts: string[] = [];
    if (message.content) parts.push(message.content);
    for (const e of message.embeds) {
      if (e.title) parts.push(`**${e.title}**`);
      if (e.description) parts.push(e.description);
    }
    const source = parts.join("\n\n").trim();
    if (!source) return;

    const translated = await translate(source, t.targetLang);
    if (!translated) return;

    const embed = new EmbedBuilder()
      .setColor(0xd4a843)
      .setAuthor({ name: LANG_LABEL[t.targetLang] ?? "🌍 Tłumaczenie" })
      // Limit opisu embeda Discorda to 4096 znaków.
      .setDescription(translated.slice(0, 4096));

    await message
      .reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
      .catch(() => {});
  } catch {
    // best-effort — błąd jednej wiadomości nie wywraca listenera
  }
}
