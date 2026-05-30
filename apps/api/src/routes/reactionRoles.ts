import { reactionRoleRepository } from "@jurassic-haven/db";
import { Hono } from "hono";

import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";

function hexToDecimal(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

export const reactionRoleRoutes = new Hono<{ Variables: AppVariables }>();

reactionRoleRoutes.use("*", authMiddleware);

reactionRoleRoutes.get("/:guildId/reaction-roles", async (c) => {
  const guildId = c.req.param("guildId");
  const list = await reactionRoleRepository.getByGuildId(guildId);
  return c.json(list);
});

reactionRoleRoutes.post("/:guildId/reaction-roles", async (c) => {
  const guildId = c.req.param("guildId");
  const body = (await c.req.json().catch(() => null)) as {
    channelId: string;
    title: string;
    content: string;
    color?: string;
    entries: Array<{ emoji: string; roleId: string }>;
  } | null;

  if (!body?.channelId || !body?.title || !body?.content || !body?.entries?.length) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  // Wyślij jako embed
  const embed = {
    title: body.title,
    description: body.content,
    color: body.color ? hexToDecimal(body.color) : hexToDecimal("#d4a843"),
  };

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
    title: body.title,
    content: body.content,
    color: body.color,
    entries: body.entries,
  });

  return c.json(created, 201);
});

reactionRoleRoutes.delete("/:guildId/reaction-roles/:messageId", async (c) => {
  const messageId = c.req.param("messageId");
  const botToken = process.env.DISCORD_TOKEN;

  const config = await reactionRoleRepository.getByMessageId(messageId);
  if (!config) return c.json({ error: "Not found" }, 404);

  if (botToken) {
    await fetch(`${DISCORD_API}/channels/${config.channelId}/messages/${messageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bot ${botToken}` },
    }).catch(() => {});
  }

  await reactionRoleRepository.delete(messageId);
  return c.json({ ok: true });
});
