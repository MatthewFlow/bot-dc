// Współdzielony, generyczny model embeda Discord — używany przez panel (edytor),
// API (wysyłka przez REST) oraz bota (discord.js akceptuje ten sam JSON w embeds:[]).

export type EmbedFieldConfig = {
  name: string;
  value: string;
  inline?: boolean;
};

export type EmbedConfig = {
  title?: string;
  description?: string;
  /** Kolor jako liczba dziesiętna (0xRRGGBB). */
  color?: number;
  url?: string;
  authorName?: string;
  authorIconUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  /** Czy dokleić aktualny timestamp przy wysyłce. */
  timestamp?: boolean;
  fields?: EmbedFieldConfig[];
};

/** Kształt embeda w formacie Discord REST API (zgodny też z discord.js APIEmbed). */
export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  author?: { name: string; icon_url?: string };
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
};

function clean(
  value: string | undefined,
  sub?: (v: string) => string,
): string | undefined {
  if (value == null) return undefined;
  const out = (sub ? sub(value) : value).trim();
  return out.length ? out : undefined;
}

/**
 * Konwertuje konfigurację embeda na obiekt embeda Discorda.
 * `sub` (opcjonalne) podstawia zmienne w polach tekstowych ({user}, {server}, …).
 * Puste pola są pomijane, a długości przycięte do limitów Discorda.
 */
export function toDiscordEmbed(
  cfg: EmbedConfig,
  sub?: (v: string) => string,
): DiscordEmbed {
  const embed: DiscordEmbed = {};

  const title = clean(cfg.title, sub);
  if (title) embed.title = title.slice(0, 256);

  const description = clean(cfg.description, sub);
  if (description) embed.description = description.slice(0, 4096);

  if (typeof cfg.color === "number" && Number.isFinite(cfg.color)) {
    embed.color = cfg.color;
  }

  const url = clean(cfg.url);
  if (url) embed.url = url;

  const authorName = clean(cfg.authorName, sub);
  if (authorName) {
    embed.author = { name: authorName.slice(0, 256) };
    const icon = clean(cfg.authorIconUrl);
    if (icon) embed.author.icon_url = icon;
  }

  const thumb = clean(cfg.thumbnailUrl, sub);
  if (thumb) embed.thumbnail = { url: thumb };

  const image = clean(cfg.imageUrl, sub);
  if (image) embed.image = { url: image };

  const footerText = clean(cfg.footerText, sub);
  if (footerText) {
    embed.footer = { text: footerText.slice(0, 2048) };
    const icon = clean(cfg.footerIconUrl);
    if (icon) embed.footer.icon_url = icon;
  }

  if (cfg.timestamp) embed.timestamp = new Date().toISOString();

  if (cfg.fields?.length) {
    const fields = cfg.fields
      .map((f) => ({
        name: clean(f.name, sub) ?? "",
        value: clean(f.value, sub) ?? "",
        inline: Boolean(f.inline),
      }))
      .filter((f) => f.name && f.value)
      .slice(0, 25);
    if (fields.length) embed.fields = fields;
  }

  return embed;
}

/** Discord odrzuca embed bez żadnej widocznej treści — pozwala to wykryć taki przypadek. */
export function isEmbedEmpty(embed: DiscordEmbed): boolean {
  return (
    !embed.title &&
    !embed.description &&
    !embed.fields?.length &&
    !embed.image &&
    !embed.thumbnail &&
    !embed.author &&
    !embed.footer
  );
}
