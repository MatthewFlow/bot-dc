import {
  buttonRoleRepository,
  type EmbedConfig,
  isEmbedEmpty,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { channelInGuild } from "../lib/channelGuard";
import {
  botHeaders,
  DISCORD_API,
  messageIdSchema,
  requireBotToken,
} from "../lib/discord";
import { canAccessGuild } from "../lib/guildGuard";
import { buttonRolesSchema, parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const BUTTON_STYLE_SECONDARY = 2;

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
  const parsed = await parseBody(c, buttonRolesSchema);
  if (!parsed.ok) return parsed.res;
  const { channelId, embed: rawEmbed, entries } = parsed.data;

  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  // Target channel must belong to this guild (same guard as the other send paths).
  if (!(await channelInGuild(channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  const embed = toDiscordEmbed(rawEmbed as EmbedConfig);
  if (isEmbedEmpty(embed)) return c.json({ error: "Embed is empty" }, 400);

  const payload = { embeds: [embed], components: buildComponents(entries) };

  const msgRes = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!msgRes.ok) {
    const err = await msgRes.text();
    console.error("[button-roles] Błąd wysyłania wiadomości:", err);
    return c.json({ error: "Failed to send message" }, 502);
  }

  const msg = messageIdSchema.safeParse(await msgRes.json());
  if (!msg.success) return c.json({ error: "Failed to send message" }, 502);

  const created = await buttonRoleRepository.create({
    guildId,
    channelId,
    messageId: msg.data.id,
    embed: rawEmbed as EmbedConfig,
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
      headers: botHeaders(botToken),
    }).catch(() => {});
  }

  await buttonRoleRepository.delete(messageId);
  return c.json({ ok: true });
});
