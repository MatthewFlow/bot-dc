import {
  type EmbedConfig,
  isEmbedEmpty,
  stickyMessageRepository,
  stickyPayload,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { channelInGuild } from "../lib/channelGuard";
import {
  botHeaders,
  discordFetch,
  requireBotToken,
  sendDiscordMessage,
} from "../lib/discord";
import { guildAccessGuard } from "../lib/guildGuard";
import { parseBody, stickyUpsertSchema } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

export const stickyRoutes = new Hono<{ Variables: AppVariables }>();

stickyRoutes.use("*", authMiddleware);
stickyRoutes.use("/:guildId/*", guildAccessGuard);

/** Kasuje wskazaną wiadomość bota na kanale (best-effort). */
async function deleteMessage(channelId: string, messageId: string, token: string) {
  await discordFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
    headers: botHeaders(token),
  }).catch(() => {});
}

// Lista sticky serwera.
stickyRoutes.get("/:guildId/sticky", async (c) => {
  return c.json(await stickyMessageRepository.getByGuild(c.req.param("guildId")));
});

// Zapis/aktualizacja sticky dla kanału + natychmiastowa (re)publikacja.
stickyRoutes.put("/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");
  const parsed = await parseBody(c, stickyUpsertSchema);
  if (!parsed.ok) return parsed.res;
  const { enabled, mode, content, embed } = parsed.data;

  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  if (!(await channelInGuild(channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  // Przy włączonym sticky musi być co wysłać (zgodnie z trybem).
  if (enabled) {
    const hasText = mode === "text" && !!content?.trim();
    const hasEmbed =
      mode === "embed" && !!embed && !isEmbedEmpty(toDiscordEmbed(embed as EmbedConfig));
    if (!hasText && !hasEmbed) {
      return c.json({ error: "Sticky musi mieć treść (tekst lub embed)." }, 400);
    }
  }

  const sticky = await stickyMessageRepository.upsert({
    guildId,
    channelId,
    enabled,
    mode,
    content,
    embed: embed as EmbedConfig | undefined,
    createdBy: c.get("userId"),
  });

  // Skasuj poprzednią kopię (jeśli była) — zaraz wyślemy świeżą albo wyłączamy.
  if (sticky.lastMessageId) {
    await deleteMessage(channelId, sticky.lastMessageId, botToken);
    await stickyMessageRepository.setLastMessageId(sticky.id, null);
  }

  // Włączony → publikujemy od razu (sticky pojawia się bez czekania na wiadomość).
  if (enabled) {
    const payload = stickyPayload(sticky);
    if (payload) {
      const sent = await sendDiscordMessage(channelId, botToken, payload, "sticky");
      if (sent) await stickyMessageRepository.setLastMessageId(sticky.id, sent.id);
    }
  }

  return c.json(
    (await stickyMessageRepository.getByChannel(guildId, channelId)) ?? sticky,
  );
});

// Usuń sticky z kanału + skasuj wiadomość.
stickyRoutes.delete("/:guildId/sticky/:channelId", async (c) => {
  const guildId = c.req.param("guildId");
  const channelId = c.req.param("channelId");

  const removed = await stickyMessageRepository.delete(guildId, channelId);
  if (!removed) return c.json({ error: "Not found" }, 404);

  const botToken = requireBotToken(c);
  if (!(botToken instanceof Response) && removed.lastMessageId) {
    await deleteMessage(channelId, removed.lastMessageId, botToken);
  }

  return c.json({ ok: true });
});
