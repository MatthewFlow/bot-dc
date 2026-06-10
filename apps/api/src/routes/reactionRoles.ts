import {
  type EmbedConfig,
  isEmbedEmpty,
  reactionRoleRepository,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { channelInGuild } from "../lib/channelGuard";
import { canAccessGuild } from "../lib/guildGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

// Custom emoji: <:nazwa:id> lub <a:nazwa:id> (animowane); name:id; samo id.
const CUSTOM_EMOJI_RE = /^<a?:(\w+):(\d+)>$/;
const NAME_ID_RE = /^(\w+):(\d+)$/;
const RAW_ID_RE = /^(\d+)$/;

/** Pobiera nazwę custom emoji z serwera po jego ID (gdy użytkownik podał samo ID). */
async function fetchGuildEmojiName(
  guildId: string,
  emojiId: string,
  botToken: string,
): Promise<string | null> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/emojis/${emojiId}`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!res.ok) return null;
  const e = (await res.json()) as { name?: string };
  return e.name ?? null;
}

/**
 * Sprowadza dowolny zapis emoji do dwóch postaci:
 * - `stored` — kanoniczna `<:nazwa:id>` (custom) lub znak unicode; po niej bot dopasowuje reakcje,
 * - `reaction` — `nazwa:id` (custom) lub znak unicode; tej wymaga endpoint PUT reactions Discorda.
 * Zwraca null, gdy podano ID custom emoji, którego nie ma na serwerze.
 */
async function resolveEmoji(
  raw: string,
  guildId: string,
  botToken: string,
): Promise<{ stored: string; reaction: string } | null> {
  const input = raw.trim();

  const custom = input.match(CUSTOM_EMOJI_RE) ?? input.match(NAME_ID_RE);
  if (custom) {
    const [, name, id] = custom;
    return { stored: `<:${name}:${id}>`, reaction: `${name}:${id}` };
  }

  const id = input.match(RAW_ID_RE)?.[1];
  if (id) {
    const name = await fetchGuildEmojiName(guildId, id, botToken);
    if (!name) return null;
    return { stored: `<:${name}:${id}>`, reaction: `${name}:${id}` };
  }

  // Standardowe emoji unicode (lub inny znak) — bez zmian.
  return { stored: input, reaction: input };
}

export const reactionRoleRoutes = new Hono<{ Variables: AppVariables }>();

reactionRoleRoutes.use("*", authMiddleware);

// Verify guild admin access for all /:guildId/* routes
reactionRoleRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  const accessToken = c.get("accessToken");
  const userId = c.get("userId");

  if (!(await canAccessGuild(accessToken, userId, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});

reactionRoleRoutes.get("/:guildId/reaction-roles", async (c) => {
  const guildId = c.req.param("guildId");
  const list = await reactionRoleRepository.getByGuildId(guildId);
  return c.json(list);
});

reactionRoleRoutes.post("/:guildId/reaction-roles", async (c) => {
  const guildId = c.req.param("guildId");
  const body = (await c.req.json().catch(() => null)) as {
    channelId: string;
    title?: string;
    content?: string;
    color?: string;
    embed?: EmbedConfig;
    entries: Array<{ emoji: string; roleId: string }>;
  } | null;

  if (!body?.channelId || !body?.entries?.length) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  if (body.entries.length > 20)
    return c.json({ error: "Too many entries (max 20)" }, 400);

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  // Kanał z body musi należeć do gildii ze ścieżki — inaczej admin jednej gildii
  // mógłby wysłać wiadomość bota do kanału innego serwera.
  if (!(await channelInGuild(body.channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  // Sprowadź wszystkie emoji do postaci kanonicznej + endpointowej PRZED wysłaniem
  // wiadomości, żeby nie zostawiać osieroconej wiadomości przy nieprawidłowym emoji.
  const resolvedEntries: Array<{ emoji: string; reaction: string; roleId: string }> = [];
  for (const entry of body.entries) {
    const resolved = await resolveEmoji(entry.emoji, guildId, botToken);
    if (!resolved) {
      return c.json(
        {
          error: `Nieznane emoji: ${entry.emoji}. Użyj standardowego emoji albo custom emoji z tego serwera (w Discordzie wpisz \\:nazwa: aby uzyskać zapis <:nazwa:id>).`,
        },
        400,
      );
    }
    resolvedEntries.push({
      emoji: resolved.stored,
      reaction: resolved.reaction,
      roleId: entry.roleId,
    });
  }

  // Tryb pełnego embeda (z edytora) ma pierwszeństwo nad legacy title/content/color.
  let embed: ReturnType<typeof toDiscordEmbed>;
  let title: string;
  let content: string;
  let colorHex: string | undefined;

  if (body.embed) {
    embed = toDiscordEmbed(body.embed);
    if (isEmbedEmpty(embed)) {
      return c.json({ error: "Embed is empty" }, 400);
    }
    title = (body.embed.title ?? "").slice(0, 256) || "Reaction roles";
    content = (body.embed.description ?? "").slice(0, 4096) || title;
    colorHex =
      typeof body.embed.color === "number"
        ? `#${body.embed.color.toString(16).padStart(6, "0")}`
        : undefined;
  } else {
    if (!body.title || !body.content) {
      return c.json({ error: "Missing required fields" }, 400);
    }
    if (body.title.length > 256)
      return c.json({ error: "Title too long (max 256)" }, 400);
    if (body.content.length > 4096)
      return c.json({ error: "Content too long (max 4096)" }, 400);
    if (body.color && !COLOR_RE.test(body.color)) {
      return c.json({ error: "Invalid color format, expected #RRGGBB" }, 400);
    }
    title = body.title;
    content = body.content;
    colorHex = body.color;
    embed = {
      title: body.title,
      description: body.content,
      color: body.color ? hexToDecimal(body.color) : hexToDecimal("#d4a843"),
    };
  }

  const msgRes = await fetch(`${DISCORD_API}/channels/${body.channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!msgRes.ok) {
    const err = await msgRes.text();
    console.error("[reaction-roles] Błąd wysyłania wiadomości:", err);
    return c.json({ error: "Failed to send message" }, 502);
  }

  const msg = (await msgRes.json()) as { id: string };

  for (const entry of resolvedEntries) {
    const emoji = encodeURIComponent(entry.reaction);
    const res = await fetch(
      `${DISCORD_API}/channels/${body.channelId}/messages/${msg.id}/reactions/${emoji}/@me`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${botToken}` },
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error(`[reaction-roles] Błąd dodawania emoji ${entry.emoji}:`, err);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  const created = await reactionRoleRepository.create({
    guildId,
    channelId: body.channelId,
    messageId: msg.id,
    title,
    content,
    color: colorHex,
    embed: body.embed,
    // Zapis kanoniczny `<:nazwa:id>` / unicode — po nim bot dopasowuje reakcje.
    entries: resolvedEntries.map((e) => ({ emoji: e.emoji, roleId: e.roleId })),
  });

  return c.json(created, 201);
});

reactionRoleRoutes.delete("/:guildId/reaction-roles/:messageId", async (c) => {
  const guildId = c.req.param("guildId");
  const messageId = c.req.param("messageId");
  const botToken = process.env.DISCORD_TOKEN;

  const config = await reactionRoleRepository.getByMessageId(messageId);
  if (!config) return c.json({ error: "Not found" }, 404);

  // Ensure the record actually belongs to the requested guild
  if (config.guildId !== guildId) return c.json({ error: "Not found" }, 404);

  if (botToken) {
    await fetch(`${DISCORD_API}/channels/${config.channelId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${botToken}` },
    }).catch(() => {});
  }

  await reactionRoleRepository.delete(messageId);
  return c.json({ ok: true });
});
