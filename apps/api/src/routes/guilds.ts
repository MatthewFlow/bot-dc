import {
  guildConfigRepository,
  levelFromXp,
  ticketRepository,
  toDiscordEmbed,
  warnRepository,
  xpRepository,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { sanitizeConfigPatch } from "../lib/configSanitize";
import { canManageGuild, fetchGuilds, isGuildAdmin } from "../lib/guildGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";

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
  "adminRoleId",
  "ticketSupportRoleId",
  "ticketSupportRoleId2",
  "ticketLogChannelId",
  "welcomeEmbed",
  "goodbyeEmbed",
  "ticketPanelEmbed",
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

export const guildRoutes = new Hono<{ Variables: AppVariables }>();

guildRoutes.use("*", authMiddleware);

// Verify guild admin access for all /:guildId/* routes
guildRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  const accessToken = c.get("accessToken");

  if (!(await isGuildAdmin(accessToken, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});

guildRoutes.get("/", async (c) => {
  const accessToken = c.get("accessToken");
  const guilds = await fetchGuilds(accessToken);
  const adminGuilds = guilds.filter((g) => canManageGuild(g.permissions));
  return c.json(adminGuilds);
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

  await guildConfigRepository.set(guildId, patch as Parameters<typeof guildConfigRepository.set>[1]);
  return c.json({ ok: true });
});

guildRoutes.get("/:guildId/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${botToken}` },
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

    const channels = (await res.json()) as Array<{
      id: string;
      name: string;
      type: number;
    }>;

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
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const body = (await c.req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return c.json({ error: "Invalid channel name" }, 400);
  }

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
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

    const ch = (await res.json()) as { id: string; name: string; type: number };
    return c.json({ id: ch.id, name: ch.name, type: ch.type }, 201);
  } catch (e) {
    console.error(`[guilds] Błąd tworzenia kanału dla ${guildId}:`, e);
    return c.json({ error: "Failed to create channel" }, 502);
  }
});

guildRoutes.post("/:guildId/ticket-panel", async (c) => {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const body = (await c.req.json().catch(() => null)) as { channelId?: unknown } | null;
  const channelId = typeof body?.channelId === "string" ? body.channelId : "";
  if (!channelId) return c.json({ error: "Missing channelId" }, 400);

  // Embed + przycisk z konfiguracji guildu (fallback do domyślnych).
  // custom_id "ticket_open" obsługuje bot — musi pozostać niezmienny.
  const guildId = c.req.param("guildId");
  const cfg = await guildConfigRepository.get(guildId);

  // Zmienne kontekstu serwera ({server}, {member_count}) — best-effort.
  let serverName = "";
  let memberCount = "";
  try {
    const gRes = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (gRes.ok) {
      const g = (await gRes.json()) as {
        name?: string;
        approximate_member_count?: number;
      };
      serverName = g.name ?? "";
      memberCount = g.approximate_member_count != null ? String(g.approximate_member_count) : "";
    }
  } catch {
    // ignore — zmienne zostaną puste
  }
  const replace = (s: string) =>
    s.replace(/{server}/g, serverName).replace(/{member_count}/g, memberCount);

  const embed = toDiscordEmbed(cfg?.ticketPanelEmbed ?? DEFAULT_TICKET_PANEL_EMBED, replace);
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
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
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

guildRoutes.get("/:guildId/roles", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
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

    const roles = (await res.json()) as Array<{
      id: string;
      name: string;
      position: number;
      managed: boolean;
    }>;

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
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const body = (await c.req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    return c.json({ error: "Invalid role name" }, 400);
  }

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
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

    const role = (await res.json()) as { id: string; name: string; position: number };
    return c.json({ id: role.id, name: role.name, position: role.position }, 201);
  } catch (e) {
    console.error(`[guilds] Błąd tworzenia roli dla ${guildId}:`, e);
    return c.json({ error: "Failed to create role" }, 502);
  }
});

guildRoutes.get("/:guildId/leaderboard", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const raw = Number(c.req.query("limit") ?? 10);
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 10;

  try {
    const entries = await xpRepository.getLeaderboard(guildId, limit);

    const enriched = await Promise.all(
      entries.map(async (entry, idx) => {
        const res = await fetch(
          `${DISCORD_API}/guilds/${guildId}/members/${entry.userId}`,
          {
            headers: { Authorization: `Bot ${botToken}` },
          },
        );

        let username = entry.userId;
        let avatar: string | null = null;

        if (res.ok) {
          const member = (await res.json()) as {
            nick?: string;
            user: { username: string; avatar: string | null; id: string };
            avatar: string | null;
          };
          username = member.nick ?? member.user.username;
          const avatarHash = member.avatar ?? member.user.avatar;
          if (avatarHash) {
            avatar = `https://cdn.discordapp.com/avatars/${entry.userId}/${avatarHash}.png`;
          }
        }

        return {
          position: idx + 1,
          userId: entry.userId,
          username,
          avatar,
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
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const auth = { headers: { Authorization: `Bot ${botToken}` } };

  // Liczba członków + online (approximate z Discorda)
  const guildInfo = (async () => {
    try {
      const res = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, auth);
      if (!res.ok) return { memberCount: null, onlineCount: null };
      const g = (await res.json()) as {
        approximate_member_count?: number;
        approximate_presence_count?: number;
      };
      return {
        memberCount: g.approximate_member_count ?? null,
        onlineCount: g.approximate_presence_count ?? null,
      };
    } catch {
      return { memberCount: null, onlineCount: null };
    }
  })();

  // Liczba banów — pierwsza strona (max 1000). Wymaga uprawnienia BAN_MEMBERS.
  const banInfo = (async () => {
    try {
      const res = await fetch(`${DISCORD_API}/guilds/${guildId}/bans?limit=1000`, auth);
      if (!res.ok) return { banCount: null as number | null, banCountCapped: false };
      const bans = (await res.json()) as unknown[];
      return { banCount: bans.length, banCountCapped: bans.length >= 1000 };
    } catch {
      return { banCount: null as number | null, banCountCapped: false };
    }
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
