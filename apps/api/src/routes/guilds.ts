import { guildConfigRepository, levelFromXp, xpRepository } from "@jurassic-haven/db";
import { Hono } from "hono";

import { fetchGuilds, isGuildAdmin } from "../lib/guildGuard";
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
] as const;

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
  const adminGuilds = guilds.filter(
    (g) => (BigInt(g.permissions) & BigInt(0x8)) === BigInt(0x8),
  );
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

  // Allowlist — only known config fields reach the DB
  const patch = Object.fromEntries(
    CONFIG_ALLOWED_FIELDS.filter((k) => k in raw).map((k) => [k, raw[k]]),
  );

  await guildConfigRepository.set(guildId, patch);
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
