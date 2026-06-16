import type { Feedback, FeedbackIdentityPatch, FeedbackStatus } from "@jurassic-haven/db";
import {
  feedbackRepository,
  guildConfigRepository,
  levelFromXp,
  ticketRepository,
  toDiscordEmbed,
  warnRepository,
  xpRepository,
} from "@jurassic-haven/db";
import { Hono } from "hono";
import { z } from "zod";

import { channelInGuild } from "../lib/channelGuard";
import { sanitizeConfigPatch } from "../lib/configSanitize";
import {
  botHeaders,
  discordJson,
  discordProxy,
  fetchGuildCounts,
  requireBotToken,
  serverVarReplacer,
} from "../lib/discord";
import { canAccessGuild, fetchAccessibleGuilds } from "../lib/guildGuard";
import { createMemberResolver } from "../lib/memberResolver";
import { channelIdSchema, nameSchema, parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_CHANNEL_TYPES = {
  GuildText: 0,
  GuildAnnouncement: 5,
} as const;

const CONFIG_ALLOWED_FIELDS = [
  "welcomeChannelId",
  "goodbyeChannelId",
  "levelUpChannelId",
  "joinRoleId",
  "verifiedRoleId",
  "welcomeMessage",
  "goodbyeMessage",
  "roleRewards",
  "modLogChannelId",
  "feedbackChannelId",
  "adminRoleId",
  "ticketSupportRoleId",
  "ticketSupportRoleId2",
  "ticketLogChannelId",
  "welcomeEmbed",
  "goodbyeEmbed",
  "ticketPanelEmbed",
  "feedbackPanelEmbed",
  "ticketPanelButton",
  "levelUpEmbed",
  "autoMod",
  "serverLog",
  "leveling",
  "disabledCommands",
] as const;

// Domyślny embed panelu ticketów, gdy guild nie skonfigurował własnego.
const DEFAULT_TICKET_PANEL_EMBED = {
  title: "📩 Złóż ticket",
  description:
    "Naciśnij przycisk poniżej, opisz swój problem, a Twoje zgłoszenie trafi do ekipy. " +
    "Po przejęciu przez moderatora lub admina otrzymasz pomoc w prywatnym wątku.",
  color: 0x5865f2,
};

// Domyślny embed panelu feedbacku.
const DEFAULT_FEEDBACK_PANEL_EMBED = {
  title: "💡 Podziel się opinią",
  description:
    "Masz pomysł, uwagę albo znalazłeś błąd? Kliknij przycisk poniżej i napisz nam — " +
    "Twoja opinia trafi prosto do ekipy.",
  color: 0xd4a843,
};

const discordChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.number(),
});
const discordRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.number(),
  managed: z.boolean().optional(),
});

export const guildRoutes = new Hono<{ Variables: AppVariables }>();

guildRoutes.use("*", authMiddleware);

// Verify guild admin access for all /:guildId/* routes
guildRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  const accessToken = c.get("accessToken");
  const userId = c.get("userId");

  if (!(await canAccessGuild(accessToken, userId, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});

guildRoutes.get("/", async (c) => {
  const accessToken = c.get("accessToken");
  const userId = c.get("userId");
  return c.json(await fetchAccessibleGuilds(accessToken, userId));
});

guildRoutes.get("/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const cfg = await guildConfigRepository.get(guildId);
  return c.json(cfg ?? {});
});

guildRoutes.put("/:guildId/config", async (c) => {
  const guildId = c.req.param("guildId");
  const raw: unknown = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const body = raw as Record<string, unknown>;

  // Allowlist — only known config fields reach the DB — then validate/clamp each value.
  const allowlisted = Object.fromEntries(
    CONFIG_ALLOWED_FIELDS.filter((k) => k in body).map((k) => [k, body[k]]),
  );
  const patch = sanitizeConfigPatch(allowlisted);

  await guildConfigRepository.set(
    guildId,
    patch as Parameters<typeof guildConfigRepository.set>[1],
  );
  return c.json({ ok: true });
});

guildRoutes.get("/:guildId/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const channels = await discordProxy(
    c,
    `/guilds/${guildId}/channels`,
    z.array(discordChannelSchema),
    { headers: botHeaders(botToken) },
    "fetch channels",
  );
  if (channels instanceof Response) return channels;

  const textChannels = channels
    .filter(
      (ch) =>
        ch.type === DISCORD_CHANNEL_TYPES.GuildText ||
        ch.type === DISCORD_CHANNEL_TYPES.GuildAnnouncement,
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return c.json(textChannels);
});

guildRoutes.post("/:guildId/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const parsed = await parseBody(c, nameSchema);
  if (!parsed.ok) return parsed.res;

  const ch = await discordProxy(
    c,
    `/guilds/${guildId}/channels`,
    discordChannelSchema,
    {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        name: parsed.data.name,
        type: DISCORD_CHANNEL_TYPES.GuildText,
      }),
    },
    "create channel",
  );
  if (ch instanceof Response) return ch;
  return c.json({ id: ch.id, name: ch.name, type: ch.type }, 201);
});

guildRoutes.post("/:guildId/ticket-panel", async (c) => {
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const parsed = await parseBody(c, channelIdSchema);
  if (!parsed.ok) return parsed.res;
  const channelId = parsed.data.channelId;

  // Embed + przycisk z konfiguracji guildu (fallback do domyślnych).
  // custom_id "ticket_open" obsługuje bot — musi pozostać niezmienny.
  const guildId = c.req.param("guildId");

  // Kanał z body musi należeć do tej gildii (zapobiega wysyłce do obcego serwera).
  if (!(await channelInGuild(channelId, guildId, botToken))) {
    return c.json({ error: "Channel does not belong to this guild" }, 400);
  }

  const cfg = await guildConfigRepository.get(guildId);

  // Zmienne kontekstu serwera ({server}, {member_count}) — best-effort.
  const replace = await serverVarReplacer(guildId, botToken);

  const embed = toDiscordEmbed(
    cfg?.ticketPanelEmbed ?? DEFAULT_TICKET_PANEL_EMBED,
    replace,
  );
  const btnLabel = cfg?.ticketPanelButton?.label?.trim() || "Złóż ticket";
  const btnEmoji = cfg?.ticketPanelButton?.emoji?.trim() || "📩";

  const payload = {
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: btnLabel.slice(0, 80),
            custom_id: "ticket_open",
            ...(btnEmoji ? { emoji: { name: btnEmoji } } : {}),
          },
        ],
      },
    ],
  };

  const sent = await discordProxy(
    c,
    `/channels/${channelId}/messages`,
    z.unknown(),
    {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
    "send ticket panel",
  );
  if (sent instanceof Response) return sent;
  return c.json({ ok: true });
});

guildRoutes.post("/:guildId/feedback-panel", async (c) => {
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const guildId = c.req.param("guildId");
  const cfg = await guildConfigRepository.get(guildId);
  const channelId = cfg?.feedbackChannelId;
  if (!channelId) {
    return c.json({ error: "Najpierw ustaw kanał feedbacku w ustawieniach." }, 400);
  }

  // Skonfigurowany kanał musi należeć do tej gildii (config jest tylko walidowany
  // długością, więc bez tego można by wskazać kanał innego serwera).
  if (!(await channelInGuild(channelId, guildId, botToken))) {
    return c.json({ error: "Feedback channel does not belong to this guild" }, 400);
  }

  // Zmienne kontekstu serwera ({server}, {member_count}) — best-effort.
  const replace = await serverVarReplacer(guildId, botToken);

  // custom_id "feedback_open" obsługuje bot — musi pozostać niezmienny.
  const embed = toDiscordEmbed(
    cfg?.feedbackPanelEmbed ?? DEFAULT_FEEDBACK_PANEL_EMBED,
    replace,
  );

  const payload = {
    embeds: [embed],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 1,
            label: "Podziel się opinią",
            custom_id: "feedback_open",
            emoji: { name: "💡" },
          },
        ],
      },
    ],
  };

  const sent = await discordProxy(
    c,
    `/channels/${channelId}/messages`,
    z.unknown(),
    {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    },
    "send feedback panel",
  );
  if (sent instanceof Response) return sent;
  return c.json({ ok: true });
});

// Mapuje rekord z bazy na kształt dla panelu: liczba głosów + czy bieżący
// admin zagłosował (lista userId-ów głosujących nie wychodzi na zewnątrz).
function toClientFeedback(f: Feedback, userId: string) {
  const { upvotedBy, ...rest } = f;
  return {
    ...rest,
    upvotes: upvotedBy.length,
    upvotedByMe: upvotedBy.includes(userId),
  };
}

// Lista feedbacków serwera + liczba nieprzeczytanych dla bieżącego admina.
// Pseudonim + avatar są zapisane przy wysyłce (denormalizacja) → dla nowych rekordów
// to czysty odczyt z bazy. Tylko stare rekordy bez zapisanej tożsamości dociągamy
// z Discorda (resolver cache'uje per żądanie), więc koszt z czasem znika.
guildRoutes.get("/:guildId/feedback", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.get("userId");
  // seenAt warunkuje licznik nieprzeczytanych — najpierw on, potem lista + count równolegle.
  const seenAt = await feedbackRepository.getSeenAt(userId, guildId);
  const [items, unread] = await Promise.all([
    feedbackRepository.getByGuild(guildId, 50),
    feedbackRepository.countByGuildSince(guildId, seenAt),
  ]);

  const botToken = requireBotToken(c);
  const resolve = createMemberResolver(
    guildId,
    botToken instanceof Response ? undefined : botToken,
  );
  // Tożsamości rozwiązane z Discorda zapisujemy z powrotem na rekord (denormalizacja),
  // więc kolejne odczyty są czyste z bazy — koszt resolve z czasem znika.
  const backfill: FeedbackIdentityPatch[] = [];
  const enriched = await Promise.all(
    items.map(async (f) => {
      const base = toClientFeedback(f, userId);
      // Zdenormalizowane (nowe rekordy) → bez zapytania do Discorda.
      if (f.displayName && f.avatar) return base;
      const m = await resolve(f.userId);
      const displayName = f.displayName ?? m.displayName ?? f.username;
      const avatar = f.avatar ?? m.avatar;
      const username = m.username ?? f.username;
      // Zapisz tylko to, czego naprawdę brakuje na rekordzie i co udało się rozwiązać.
      if ((m.displayName && !f.displayName) || (m.avatar && !f.avatar)) {
        backfill.push({
          id: f.id,
          displayName: f.displayName ? undefined : m.displayName,
          avatar: f.avatar ? undefined : m.avatar,
          username: m.username ?? undefined,
        });
      }
      return { ...base, displayName, avatar, username };
    }),
  );

  // Fire-and-forget — nie blokuje odpowiedzi, błąd nie wywraca listy.
  if (backfill.length) void feedbackRepository.backfillIdentity(backfill);

  return c.json({ items: enriched, unread, seenAt });
});

const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "in_progress", "resolved"];
const feedbackStatusSchema = z.object({ status: z.enum(FEEDBACK_STATUSES) });
const feedbackReplySchema = z.object({
  message: z.string().trim().min(1, "Reply required").max(1000, "Reply too long"),
});

// Zmień status zgłoszenia (nowe / w trakcie / rozwiązane).
guildRoutes.patch("/:guildId/feedback/:feedbackId/status", async (c) => {
  const body = await parseBody(c, feedbackStatusSchema);
  if (!body.ok) return body.res;
  const guildId = c.req.param("guildId");
  const updated = await feedbackRepository.setStatus(
    c.req.param("feedbackId"),
    guildId,
    body.data.status,
  );
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(toClientFeedback(updated, c.get("userId")));
});

// Przełącz głos bieżącego admina na zgłoszeniu.
guildRoutes.post("/:guildId/feedback/:feedbackId/upvote", async (c) => {
  const userId = c.get("userId");
  const updated = await feedbackRepository.toggleUpvote(
    c.req.param("feedbackId"),
    c.req.param("guildId"),
    userId,
  );
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(toClientFeedback(updated, userId));
});

// Dodaj odpowiedź ekipy do zgłoszenia.
guildRoutes.post("/:guildId/feedback/:feedbackId/replies", async (c) => {
  const body = await parseBody(c, feedbackReplySchema);
  if (!body.ok) return body.res;
  const userId = c.get("userId");
  const updated = await feedbackRepository.addReply(
    c.req.param("feedbackId"),
    c.req.param("guildId"),
    {
      authorId: userId,
      authorName: c.get("username"),
      message: body.data.message,
      createdAt: new Date(),
    },
  );
  if (!updated) return c.json({ error: "Not found" }, 404);
  return c.json(toClientFeedback(updated, userId));
});

// Oznacz feedbacki serwera jako przeczytane (przez bieżącego admina) do teraz.
guildRoutes.post("/:guildId/feedback/seen", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.get("userId");
  await feedbackRepository.markSeen(userId, guildId, new Date());
  return c.json({ ok: true });
});

// Usuń zgłoszenie z serwera.
guildRoutes.delete("/:guildId/feedback/:feedbackId", async (c) => {
  const guildId = c.req.param("guildId");
  const ok = await feedbackRepository.delete(c.req.param("feedbackId"), guildId);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

guildRoutes.get("/:guildId/roles", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const roles = await discordProxy(
    c,
    `/guilds/${guildId}/roles`,
    z.array(discordRoleSchema),
    { headers: botHeaders(botToken) },
    "fetch roles",
  );
  if (roles instanceof Response) return roles;

  const filtered = roles
    .filter((r) => !r.managed && r.name !== "@everyone")
    .sort((a, b) => b.position - a.position);

  return c.json(filtered);
});

guildRoutes.post("/:guildId/roles", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const parsed = await parseBody(c, nameSchema);
  if (!parsed.ok) return parsed.res;

  const role = await discordProxy(
    c,
    `/guilds/${guildId}/roles`,
    discordRoleSchema,
    {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name: parsed.data.name }),
    },
    "create role",
  );
  if (role instanceof Response) return role;
  return c.json({ id: role.id, name: role.name, position: role.position }, 201);
});

guildRoutes.get("/:guildId/leaderboard", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const raw = Number(c.req.query("limit") ?? 10);
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 10;

  try {
    const entries = await xpRepository.getLeaderboard(guildId, limit);

    // Wspólny resolver: cache po ID, retry na 429 i fallback /users/{id} dla byłych
    // członków — minimalizuje sytuacje, gdy panel pokazuje gołe ID zamiast nazwy.
    const resolve = createMemberResolver(guildId, botToken);
    const enriched = await Promise.all(
      entries.map(async (entry, idx) => {
        const m = await resolve(entry.userId);
        return {
          position: idx + 1,
          userId: entry.userId,
          // displayName fallbackuje na ID tylko gdy konto jest naprawdę nieosiągalne.
          displayName: m.displayName ?? entry.userId,
          username: m.username,
          avatar: m.avatar,
          xp: entry.xp,
          level: levelFromXp(entry.xp),
        };
      }),
    );

    return c.json(enriched);
  } catch (e) {
    console.error(`[guilds] Błąd pobierania leaderboard dla ${guildId}:`, e);
    return c.json({ error: "Failed to fetch leaderboard" }, 502);
  }
});

// Zbiorcze statystyki na overview dashboardu. Każde źródło best-effort —
// gdy Discord/uprawnienia zawiodą, dane pole jest null (panel pokaże „—").
guildRoutes.get("/:guildId/stats", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const auth = { headers: botHeaders(botToken) };

  // Liczba członków + online (approximate z Discorda)
  const guildInfo = (async () => {
    const g = await fetchGuildCounts(guildId, botToken);
    return {
      memberCount: g?.approximate_member_count ?? null,
      onlineCount: g?.approximate_presence_count ?? null,
    };
  })();

  // Liczba banów — pierwsza strona (max 1000). Wymaga uprawnienia BAN_MEMBERS.
  const banInfo = (async () => {
    const bans = await discordJson(
      `/guilds/${guildId}/bans?limit=1000`,
      z.array(z.unknown()),
      auth,
    );
    if (!bans) return { banCount: null as number | null, banCountCapped: false };
    return { banCount: bans.length, banCountCapped: bans.length >= 1000 };
  })();

  const [{ memberCount, onlineCount }, { banCount, banCountCapped }, warnCount, tickets] =
    await Promise.all([
      guildInfo,
      banInfo,
      warnRepository.countByGuild(guildId),
      ticketRepository.counts(guildId),
    ]);

  return c.json({
    memberCount,
    onlineCount,
    banCount,
    banCountCapped,
    warnCount,
    tickets,
  });
});
