import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import type {
  Client,
  NonThreadGuildBasedChannel,
  Role,
} from "discord.js";
import { ChannelType } from "discord.js";
import { getConfig, setConfig } from "../config/guildConfig";

type RoleReward = { level: number; roleId: string };

type GuildConfigPatch = {
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  roleRewards?: RoleReward[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseRoleRewards(v: unknown): RoleReward[] | undefined {
  if (!Array.isArray(v)) return undefined;

  const parsed: RoleReward[] = [];

  for (const item of v) {
    if (!isRecord(item)) continue;

    const level = item.level;
    const roleId = item.roleId;

    // najpierw zawężenie typu
    if (typeof level !== "number") continue;
    if (!Number.isInteger(level)) continue;
    if (level < 1) continue;

    if (typeof roleId !== "string" || roleId.length === 0) continue;

    parsed.push({ level, roleId });
  }

  parsed.sort((a, b) => a.level - b.level);
  return parsed;
}

function parseConfigPatch(body: unknown): GuildConfigPatch | null {
  if (!isRecord(body)) return null;

  const nextCfg: GuildConfigPatch = {};

  const welcome = body.welcomeChannelId;
  if (typeof welcome === "string") nextCfg.welcomeChannelId = welcome;

  const goodbye = body.goodbyeChannelId;
  if (typeof goodbye === "string") nextCfg.goodbyeChannelId = goodbye;

  const levelUp = body.levelUpChannelId;
  if (typeof levelUp === "string") nextCfg.levelUpChannelId = levelUp;

  const rewards = parseRoleRewards(body.roleRewards);
  if (rewards) nextCfg.roleRewards = rewards;

  return nextCfg;
}

function requireAuth(c: Context): boolean {
  const token = process.env.API_TOKEN;
  if (!token) return true;

  const header = c.req.header("authorization") ?? "";
  return header === `Bearer ${token}`;
}

function isAllowedTextChannel(
  ch: NonThreadGuildBasedChannel | null,
): ch is NonThreadGuildBasedChannel {
  if (!ch) return false;

  return (
    ch.type === ChannelType.GuildText ||
    ch.type === ChannelType.GuildAnnouncement
  );
}

export function startApi(client: Client) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "PUT", "OPTIONS"],
    }),
  );

  app.use("/api/*", async (c, next) => {
    if (!requireAuth(c)) return c.json({ error: "Unauthorized" }, 401);
    await next();
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  // ===== Config =====
  app.get("/api/guilds/:guildId/config", (c) => {
    const guildId = c.req.param("guildId");
    const cfg = getConfig(guildId) ?? {};
    return c.json(cfg);
  });

  app.put("/api/guilds/:guildId/config", async (c) => {
    const guildId = c.req.param("guildId");

    const body: unknown = await c.req.json().catch(() => null);
    const patch = parseConfigPatch(body);
    if (!patch) return c.json({ error: "Invalid JSON body" }, 400);

    setConfig(guildId, patch);
    return c.json({ ok: true });
  });

  // ===== Channels (from Discord) =====
  app.get("/api/guilds/:guildId/channels", async (c) => {
    const guildId = c.req.param("guildId");
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return c.json({ error: "Bot not in guild / unknown guildId" }, 404);
    }

    const channels = await guild.channels.fetch();

    const list = [...channels.values()]
      .filter((ch): ch is NonThreadGuildBasedChannel => !!ch && !ch.isThread())
      .filter(isAllowedTextChannel)
      .map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return c.json(list);
  });

  // ===== Roles (from Discord) =====
  app.get("/api/guilds/:guildId/roles", async (c) => {
    const guildId = c.req.param("guildId");
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return c.json({ error: "Bot not in guild / unknown guildId" }, 404);
    }

    const roles = await guild.roles.fetch();

    const list = [...roles.values()]
      .filter((r): r is Role => !!r)
      .filter((r) => !r.managed)
      .map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
      }))
      .sort((a, b) => b.position - a.position);

    return c.json(list);
  });

  const port = Number(process.env.API_PORT ?? 3001);

  Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(`API działa na http://localhost:${port}`);
}
