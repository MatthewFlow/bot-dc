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
  DISCORD_API,
  discordJson,
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
  const raw = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Allowlist — only known config fields reach the DB — then validate/clamp each value.
  const allowlisted = Object.fromEntries(
    CONFIG_ALLOWED_FIELDS.filter((k) => k in raw).map((k) => [k, raw[k]]),
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

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: botHeaders(botToken),
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      return c.json(
        { error: "Rate limited by Discord", retry_after: data.retry_after },
        429,
      );
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`[guilds] Discord channels error ${res.status}:`, body);
      return c.json({ error: "Failed to fetch channels" }, 502);
    }

    const channels = z.array(discordChannelSchema).parse(await res.json());

    const textChannels = channels
      .filter(
        (ch) =>
          ch.type === DISCORD_CHANNEL_TYPES.GuildText ||
          ch.type === DISCORD_CHANNEL_TYPES.GuildAnnouncement,
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return c.json(textChannels);
  } catch (e) {
    console.error(`[guilds] Błąd pobierania kanałów dla ${guildId}:`, e);
    return c.json({ error: "Failed to fetch channels" }, 502);
  }
});

guildRoutes.post("/:guildId/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const parsed = await parseBody(c, nameSchema);
  if (!parsed.ok) return parsed.res;
  const name = parsed.data.name;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name, type: DISCORD_CHANNEL_TYPES.GuildText }),
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      return c.json(
        { error: "Rate limited by Discord", retry_after: data.retry_after },
        429,
      );
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[guilds] Discord create channel error ${res.status}:`, errBody);
      return c.json({ error: "Failed to create channel" }, 502);
    }

    const ch = discordChannelSchema.parse(await res.json());
    return c.json({ id: ch.id, name: ch.name, type: ch.type }, 201);
  } catch (e) {
    console.error(`[guilds] Błąd tworzenia kanału dla ${guildId}:`, e);
    return c.json({ error: "Failed to create channel" }, 502);
  }
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

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      return c.json(
        { error: "Rate limited by Discord", retry_after: data.retry_after },
        429,
      );
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[guilds] Discord ticket-panel error ${res.status}:`, errBody);
      return c.json({ error: "Failed to send ticket panel" }, 502);
    }

    return c.json({ ok: true });
  } catch (e) {
    console.error("[guilds] Błąd wysyłania panelu ticketów:", e);
    return c.json({ error: "Failed to send ticket panel" }, 502);
  }
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

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      return c.json(
        { error: "Rate limited by Discord", retry_after: data.retry_after },
        429,
      );
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[guilds] Discord feedback-panel error ${res.status}:`, errBody);
      return c.json({ error: "Failed to send feedback panel" }, 502);
    }

    return c.json({ ok: true });
  } catch (e) {
    console.error("[guilds] Błąd wysyłania panelu feedbacku:", e);
    return c.json({ error: "Failed to send feedback panel" }, 502);
  }
});

// Lista feedbacków serwera + liczba nieprzeczytanych dla bieżącego admina.
guildRoutes.get("/:guildId/feedback", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.get("userId");
  const [items, seenAt] = await Promise.all([
    feedbackRepository.getByGuild(guildId, 50),
    feedbackRepository.getSeenAt(userId, guildId),
  ]);
  const unread = await feedbackRepository.countByGuildSince(guildId, seenAt);
  return c.json({ items, unread, seenAt });
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

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      headers: botHeaders(botToken),
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      return c.json(
        { error: "Rate limited by Discord", retry_after: data.retry_after },
        429,
      );
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(`[guilds] Discord roles error ${res.status}:`, body);
      return c.json({ error: "Failed to fetch roles" }, 502);
    }

    const roles = z.array(discordRoleSchema).parse(await res.json());

    const filtered = roles
      .filter((r) => !r.managed && r.name !== "@everyone")
      .sort((a, b) => b.position - a.position);

    return c.json(filtered);
  } catch {
    return c.json({ error: "Failed to fetch roles" }, 502);
  }
});

guildRoutes.post("/:guildId/roles", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const parsed = await parseBody(c, nameSchema);
  if (!parsed.ok) return parsed.res;
  const name = parsed.data.name;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      method: "POST",
      headers: botHeaders(botToken, { "Content-Type": "application/json" }),
      body: JSON.stringify({ name }),
    });

    if (res.status === 429) {
      const data = (await res.json()) as { retry_after: number };
      return c.json(
        { error: "Rate limited by Discord", retry_after: data.retry_after },
        429,
      );
    }

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[guilds] Discord create role error ${res.status}:`, errBody);
      return c.json({ error: "Failed to create role" }, 502);
    }

    const role = discordRoleSchema.parse(await res.json());
    return c.json({ id: role.id, name: role.name, position: role.position }, 201);
  } catch (e) {
    console.error(`[guilds] Błąd tworzenia roli dla ${guildId}:`, e);
    return c.json({ error: "Failed to create role" }, 502);
  }
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
