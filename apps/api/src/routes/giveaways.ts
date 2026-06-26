import {
  giveawayEmbed,
  giveawayRepository,
  pickWinners,
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
import { giveawayCreateSchema, parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const BUTTON_STYLE_PRIMARY = 1;

/** Action row z przyciskiem „🎉 Dołącz" (custom_id `gw:<id>` obsługuje bot). */
function joinComponents(id: string, disabled = false) {
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: BUTTON_STYLE_PRIMARY,
          label: disabled ? "Zakończony" : "Dołącz",
          emoji: { name: "🎉" },
          custom_id: `gw:${id}`,
          disabled,
        },
      ],
    },
  ];
}

export const giveawayRoutes = new Hono<{ Variables: AppVariables }>();

giveawayRoutes.use("*", authMiddleware);
giveawayRoutes.use("/:guildId/*", guildAccessGuard);

// Lista giveawayów serwera (aktywne + zakończone, najnowsze pierwsze).
giveawayRoutes.get("/:guildId/giveaways", async (c) => {
  const guildId = c.req.param("guildId");
  return c.json(await giveawayRepository.getByGuild(guildId));
});

// Utwórz giveaway → zapis rekordu → publikacja embeda+przycisku botem → zapis messageId.
giveawayRoutes.post("/:guildId/giveaways", async (c) => {
  const guildId = c.req.param("guildId");
  const parsed = await parseBody(c, giveawayCreateSchema);
  if (!parsed.ok) return parsed.res;
  const { channelId, prize, winnerCount, endsAt } = parsed.data;

  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  // Kanał musi należeć do tej gildii (jak pozostałe ścieżki wysyłki).
  if (!(await channelInGuild(channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  const giveaway = await giveawayRepository.create({
    guildId,
    channelId,
    prize,
    winnerCount,
    endsAt,
    hostId: c.get("userId"),
  });

  const payload = {
    embeds: [toDiscordEmbed(giveawayEmbed(giveaway))],
    components: joinComponents(giveaway.id),
  };
  const msg = await sendDiscordMessage(channelId, botToken, payload, "giveaway");
  if (!msg) {
    // Nie udało się opublikować — sprzątamy rekord, żeby nie został „osierocony".
    await giveawayRepository.cancel(giveaway.id);
    return c.json({ error: "Failed to send giveaway message" }, 502);
  }

  await giveawayRepository.setMessageId(giveaway.id, msg.id);
  return c.json({ ...giveaway, messageId: msg.id }, 201);
});

// „Zakończ teraz" — przesuwamy koniec na teraz; sweep bota wylosuje i ogłosi (≤30 s).
giveawayRoutes.post("/:guildId/giveaways/:id/end", async (c) => {
  const guildId = c.req.param("guildId");
  const giveaway = await giveawayRepository.get(c.req.param("id"));
  if (!giveaway || giveaway.guildId !== guildId)
    return c.json({ error: "Not found" }, 404);
  if (giveaway.status !== "active") {
    return c.json({ error: "Giveaway nie jest aktywny" }, 400);
  }
  const updated = await giveawayRepository.expireNow(giveaway.id);
  return c.json(updated ?? giveaway);
});

// Reroll — losuje nowych zwycięzców (pomijając dotychczasowych) i ogłasza na kanale.
giveawayRoutes.post("/:guildId/giveaways/:id/reroll", async (c) => {
  const guildId = c.req.param("guildId");
  const giveaway = await giveawayRepository.get(c.req.param("id"));
  if (!giveaway || giveaway.guildId !== guildId)
    return c.json({ error: "Not found" }, 404);
  if (giveaway.status !== "ended") {
    return c.json({ error: "Reroll możliwy dopiero po zakończeniu" }, 400);
  }

  const winners = pickWinners(giveaway.entrants, giveaway.winnerCount, giveaway.winners);
  const updated = await giveawayRepository.setEnded(giveaway.id, winners);

  const botToken = requireBotToken(c);
  if (!(botToken instanceof Response)) {
    const text = winners.length
      ? `🎉 Reroll giveawaya **${giveaway.prize}**!\nNowi zwycięzcy: ${winners
          .map((id) => `<@${id}>`)
          .join(", ")}`
      : `🎉 Reroll giveawaya **${giveaway.prize}** — brak innych uczestników do wylosowania.`;
    await sendDiscordMessage(
      giveaway.channelId,
      botToken,
      { content: text, allowed_mentions: { users: winners } },
      "giveaway-reroll",
    );
  }

  return c.json(updated ?? { ...giveaway, winners });
});

// Anuluj giveaway (bez losowania) + zaktualizuj wiadomość na kanale.
giveawayRoutes.delete("/:guildId/giveaways/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const giveaway = await giveawayRepository.get(c.req.param("id"));
  if (!giveaway || giveaway.guildId !== guildId)
    return c.json({ error: "Not found" }, 404);

  const updated = await giveawayRepository.cancel(giveaway.id);

  const botToken = requireBotToken(c);
  if (!(botToken instanceof Response) && giveaway.messageId && updated) {
    await discordFetch(`/channels/${giveaway.channelId}/messages/${giveaway.messageId}`, {
      method: "PATCH",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        embeds: [toDiscordEmbed(giveawayEmbed(updated))],
        components: joinComponents(giveaway.id, true),
      }),
    }).catch(() => {});
  }

  return c.json(updated ?? giveaway);
});
