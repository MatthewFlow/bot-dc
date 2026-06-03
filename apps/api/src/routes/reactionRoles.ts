import {
  type EmbedConfig,
  isEmbedEmpty,
  reactionRoleRepository,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { isGuildAdmin } from "../lib/guildGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export const reactionRoleRoutes = new Hono<{ Variables: AppVariables }>();

reactionRoleRoutes.use("*", authMiddleware);

// Verify guild admin access for all /:guildId/* routes
reactionRoleRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  const accessToken = c.get("accessToken");

  if (!(await isGuildAdmin(accessToken, guildId))) {
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
  if (body.entries.length > 20) return c.json({ error: "Too many entries (max 20)" }, 400);

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

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
    if (body.title.length > 256) return c.json({ error: "Title too long (max 256)" }, 400);
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

  for (const entry of body.entries) {
    const emoji = encodeURIComponent(entry.emoji);
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
    entries: body.entries,
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
