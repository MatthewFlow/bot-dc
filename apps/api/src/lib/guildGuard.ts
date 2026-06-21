import { guildConfigRepository } from "@jurassic-haven/db";
import { createMiddleware } from "hono/factory";
import { z } from "zod";

import type { AppVariables } from "../types";
import { botHeaders, discordJson } from "./discord";

const ADMIN_PERM = BigInt(0x8); // ADMINISTRATOR
const MANAGE_GUILD_PERM = BigInt(0x20); // MANAGE_GUILD ("Manage Server")
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const BOT_TOKEN = process.env.DISCORD_TOKEN;

/** True if the permission bitfield grants Administrator or Manage Server. */
export function canManageGuild(permissions: string): boolean {
  const p = BigInt(permissions);
  return (p & ADMIN_PERM) === ADMIN_PERM || (p & MANAGE_GUILD_PERM) === MANAGE_GUILD_PERM;
}

const guildEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  permissions: z.string(),
});
export type GuildEntry = z.infer<typeof guildEntrySchema>;
const guildArraySchema = z.array(guildEntrySchema);
const botGuildArraySchema = z.array(z.object({ id: z.string() }));
const memberRolesSchema = z.object({ roles: z.array(z.string()).optional() });

type CacheEntry = { guilds: GuildEntry[]; expiresAt: number };

// Per-token guild list cache
const cache = new Map<string, CacheEntry>();
// Deduplicate concurrent requests for the same token
const pending = new Map<string, Promise<GuildEntry[]>>();

export async function fetchGuilds(accessToken: string): Promise<GuildEntry[]> {
  const now = Date.now();

  const hit = cache.get(accessToken);
  if (hit && hit.expiresAt > now) return hit.guilds;

  if (pending.has(accessToken)) return pending.get(accessToken)!;

  const p = (async () => {
    const guilds = await discordJson(`/users/@me/guilds`, guildArraySchema, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!guilds) return cache.get(accessToken)?.guilds ?? [];
    cache.set(accessToken, { guilds, expiresAt: Date.now() + CACHE_TTL_MS });
    return guilds;
  })().finally(() => pending.delete(accessToken));

  pending.set(accessToken, p);
  return p;
}

export async function isGuildAdmin(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const guilds = await fetchGuilds(accessToken);
  const guild = guilds.find((g) => g.id === guildId);
  return !!guild && canManageGuild(guild.permissions);
}

// ── Dostęp przez rolę „admina bota" (adminRoleId) ───────────────────────────
// Cache wyniku sprawdzenia roli członka (userId+guildId) oraz listy serwerów bota.
const roleAccessCache = new Map<string, { ok: boolean; expiresAt: number }>();
let botGuildsCache: { ids: Set<string>; expiresAt: number } | null = null;

/** Zbiór ID serwerów, na których jest bot (cache 5 min). */
async function fetchBotGuildIds(): Promise<Set<string>> {
  if (botGuildsCache && botGuildsCache.expiresAt > Date.now()) return botGuildsCache.ids;
  if (!BOT_TOKEN) return new Set();
  const arr = await discordJson(`/users/@me/guilds?limit=200`, botGuildArraySchema, {
    headers: botHeaders(BOT_TOKEN),
  });
  if (!arr) return botGuildsCache?.ids ?? new Set();
  const ids = new Set(arr.map((g) => g.id));
  botGuildsCache = { ids, expiresAt: Date.now() + CACHE_TTL_MS };
  return ids;
}

/** Czy użytkownik ma w danym serwerze rolę „admina bota" (adminRoleId z configu). */
async function hasBotAdminRole(userId: string, guildId: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  const key = `${userId}:${guildId}`;
  const hit = roleAccessCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.ok;

  let ok = false;
  const cfg = await guildConfigRepository.get(guildId);
  const roleId = cfg?.adminRoleId;
  if (roleId) {
    const member = await discordJson(
      `/guilds/${guildId}/members/${userId}`,
      memberRolesSchema,
      { headers: botHeaders(BOT_TOKEN) },
    );
    ok = member?.roles?.includes(roleId) ?? false;
  }
  roleAccessCache.set(key, { ok, expiresAt: Date.now() + CACHE_TTL_MS });
  return ok;
}

/** Dostęp do panelu serwera: Administrator/Zarządzanie serwerem LUB rola admina bota. */
export async function canAccessGuild(
  accessToken: string,
  userId: string,
  guildId: string,
): Promise<boolean> {
  if (await isGuildAdmin(accessToken, guildId)) return true;
  return hasBotAdminRole(userId, guildId);
}

/**
 * Middleware gatekeeping all `/:guildId/*` routes: 403 unless the caller can
 * administer that guild. Mount once per router (`routes.use("/:guildId/*",
 * guildAccessGuard)`) instead of repeating the same inline closure everywhere.
 * Assumes `authMiddleware` already populated `accessToken`/`userId`.
 */
export const guildAccessGuard = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    const guildId = c.req.param("guildId");
    if (
      !guildId ||
      !(await canAccessGuild(c.get("accessToken"), c.get("userId"), guildId))
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  },
);

/**
 * Okresowo usuwa wygasłe wpisy z cache listy serwerów (per token) i cache roli
 * admina (per user+guild) — bez tego rotacja tokenów/userów rozdyma mapy. Wołane
 * raz przy starcie API; `unref`, by nie blokować zamknięcia procesu.
 */
export function startGuildGuardSweep(): () => void {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k);
    for (const [k, v] of roleAccessCache)
      if (v.expiresAt <= now) roleAccessCache.delete(k);
  }, CACHE_TTL_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}

/** Serwery widoczne w panelu: zarządzane (Manage Server) + te z rolą admina bota. */
export async function fetchAccessibleGuilds(
  accessToken: string,
  userId: string,
): Promise<GuildEntry[]> {
  const guilds = await fetchGuilds(accessToken);
  const managed = guilds.filter((g) => canManageGuild(g.permissions));
  const managedIds = new Set(managed.map((g) => g.id));

  // Tylko współdzielone serwery (bot obecny), na których user nie jest jeszcze adminem.
  const botIds = await fetchBotGuildIds();
  const candidates = guilds.filter((g) => !managedIds.has(g.id) && botIds.has(g.id));

  // Sprawdzenia roli równolegle — każde to osobne zapytanie do Discorda, więc
  // seryjne `await` w pętli niepotrzebnie sumowało latencję dla wielu serwerów.
  const checks = await Promise.all(
    candidates.map(async (g) => ((await hasBotAdminRole(userId, g.id)) ? g : null)),
  );
  const roleBased = checks.filter((g): g is GuildEntry => g !== null);
  return [...managed, ...roleBased];
}
