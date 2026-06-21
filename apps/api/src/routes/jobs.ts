import {
  botJobRepository,
  type EmbedConfig,
  isEmbedEmpty,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { Hono } from "hono";
import { z } from "zod";

import { channelInGuild } from "../lib/channelGuard";
import { requireBotToken, sendDiscordMessage } from "../lib/discord";
import { guildAccessGuard } from "../lib/guildGuard";
import { idSchema, parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

export const jobRoutes = new Hono<{ Variables: AppVariables }>();

jobRoutes.use("*", authMiddleware);

jobRoutes.use("/:guildId/*", guildAccessGuard);

jobRoutes.get("/:guildId/jobs", async (c) => {
  const guildId = c.req.param("guildId");
  return c.json(await botJobRepository.getActiveByGuild(guildId, 50));
});

const jobBodySchema = z.object({
  channelId: idSchema,
  // Pełny EmbedConfig — walidowany niżej przez toDiscordEmbed/isEmbedEmpty.
  embed: z.record(z.string(), z.unknown()),
  mode: z.enum(["now", "schedule", "recurring"]),
  /** ISO — wymagane dla schedule/recurring. */
  runAt: z.string().optional(),
  recurrence: z.enum(["daily", "weekly"]).optional(),
});

jobRoutes.post("/:guildId/jobs", async (c) => {
  const guildId = c.req.param("guildId");
  const parsed = await parseBody(c, jobBodySchema);
  if (!parsed.ok) return parsed.res;
  const { channelId, embed: rawEmbed, mode, runAt, recurrence } = parsed.data;

  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  if (!(await channelInGuild(channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  const embed = toDiscordEmbed(rawEmbed as EmbedConfig);
  if (isEmbedEmpty(embed)) return c.json({ error: "Embed is empty" }, 400);

  // „Wyślij teraz" — bezpośrednia publikacja (bez kolejki).
  if (mode === "now") {
    const msg = await sendDiscordMessage(
      channelId,
      botToken,
      { embeds: [embed] },
      "announce",
    );
    if (!msg) return c.json({ error: "Failed to send message" }, 502);
    return c.json({ sent: true });
  }

  // „Zaplanuj"/„Cyklicznie" — do kolejki; worker bota wyśle o czasie.
  const when = runAt ? new Date(runAt) : null;
  if (!when || Number.isNaN(when.getTime())) {
    return c.json({ error: "Invalid runAt" }, 400);
  }

  const job = await botJobRepository.create({
    guildId,
    type: "sendEmbed",
    runAt: when,
    recurrence: mode === "recurring" ? (recurrence ?? "daily") : "once",
    channelId,
    embed: rawEmbed as EmbedConfig,
    createdBy: c.get("userId"),
  });
  return c.json(job, 201);
});

jobRoutes.delete("/:guildId/jobs/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const ok = await botJobRepository.delete(id, guildId);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
