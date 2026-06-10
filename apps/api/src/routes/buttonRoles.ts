import {
  buttonRoleRepository,
  type EmbedConfig,
  isEmbedEmpty,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { channelInGuild } from "../lib/channelGuard";
import { canAccessGuild } from "../lib/guildGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";
const BUTTON_STYLE_SECONDARY = 2;
const MAX_BUTTONS = 25; // 5 rows × 5 buttons (Discord limit)

type ButtonRoleInputEntry = { label: string; emoji?: string; roleId: string };

/** Builds the Discord emoji object for a button: custom `<:name:id>` or unicode. */
function buildEmoji(raw?: string): { id?: string; name?: string } | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  const custom = s.match(/^<a?:(\w+):(\d+)>$/);
  if (custom) return { id: custom[2], name: custom[1] };
  return { name: s };
}

/** Splits entries into action rows of up to 5 buttons each (Discord limit). */
function buildComponents(entries: ButtonRoleInputEntry[]) {
  const rows: unknown[] = [];
  for (let i = 0; i < entries.length; i += 5) {
    rows.push({
      type: 1,
      components: entries.slice(i, i + 5).map((e) => ({
        type: 2,
        style: BUTTON_STYLE_SECONDARY,
        label: e.label.slice(0, 80),
        // custom_id "br:<roleId>" is parsed by the bot — no DB lookup on click.
        custom_id: `br:${e.roleId}`,
        ...(buildEmoji(e.emoji) ? { emoji: buildEmoji(e.emoji) } : {}),
      })),
    });
  }
  return rows;
}

export const buttonRoleRoutes = new Hono<{ Variables: AppVariables }>();

buttonRoleRoutes.use("*", authMiddleware);

buttonRoleRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  const accessToken = c.get("accessToken");
  const userId = c.get("userId");
  if (!(await canAccessGuild(accessToken, userId, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});

buttonRoleRoutes.get("/:guildId/button-roles", async (c) => {
  const guildId = c.req.param("guildId");
  return c.json(await buttonRoleRepository.getByGuildId(guildId));
});

buttonRoleRoutes.post("/:guildId/button-roles", async (c) => {
  const guildId = c.req.param("guildId");
  const body = (await c.req.json().catch(() => null)) as {
    channelId?: string;
    embed?: EmbedConfig;
    entries?: ButtonRoleInputEntry[];
  } | null;

  if (!body?.channelId || !body.embed || !body.entries?.length) {
    return c.json({ error: "Missing required fields" }, 400);
  }
  if (body.entries.length > MAX_BUTTONS) {
    return c.json({ error: `Too many buttons (max ${MAX_BUTTONS})` }, 400);
  }

  // Validate + normalize each entry.
  const entries: ButtonRoleInputEntry[] = [];
  for (const e of body.entries) {
    const label = typeof e?.label === "string" ? e.label.trim() : "";
    const roleId = typeof e?.roleId === "string" ? e.roleId.trim() : "";
    if (!label || label.length > 80 || !roleId || roleId.length > 32) {
      return c.json({ error: "Each button needs a label (≤80) and a role" }, 400);
    }
    const emoji = typeof e?.emoji === "string" ? e.emoji.trim() : undefined;
    entries.push({ label, roleId, emoji: emoji || undefined });
  }

  // One button per role: duplicate roleIds would collide on custom_id "br:<roleId>".
  const roleIds = new Set(entries.map((e) => e.roleId));
  if (roleIds.size !== entries.length) {
    return c.json({ error: "Each role can only have one button" }, 400);
  }

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  // Target channel must belong to this guild (same guard as the other send paths).
  if (!(await channelInGuild(body.channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  const embed = toDiscordEmbed(body.embed);
  if (isEmbedEmpty(embed)) return c.json({ error: "Embed is empty" }, 400);

  const payload = { embeds: [embed], components: buildComponents(entries) };

  const msgRes = await fetch(`${DISCORD_API}/channels/${body.channelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!msgRes.ok) {
    const err = await msgRes.text();
    console.error("[button-roles] Błąd wysyłania wiadomości:", err);
    return c.json({ error: "Failed to send message" }, 502);
  }

  const msg = (await msgRes.json()) as { id: string };

  const created = await buttonRoleRepository.create({
    guildId,
    channelId: body.channelId,
    messageId: msg.id,
    embed: body.embed,
    entries,
  });

  return c.json(created, 201);
});

buttonRoleRoutes.delete("/:guildId/button-roles/:messageId", async (c) => {
  const guildId = c.req.param("guildId");
  const messageId = c.req.param("messageId");
  const botToken = process.env.DISCORD_TOKEN;

  const config = await buttonRoleRepository.getByMessageId(messageId);
  if (!config || config.guildId !== guildId) return c.json({ error: "Not found" }, 404);

  if (botToken) {
    await fetch(`${DISCORD_API}/channels/${config.channelId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${botToken}` },
    }).catch(() => {});
  }

  await buttonRoleRepository.delete(messageId);
  return c.json({ ok: true });
});
