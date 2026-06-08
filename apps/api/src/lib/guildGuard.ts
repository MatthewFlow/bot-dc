const DISCORD_API = "https://discord.com/api/v10";
const ADMIN_PERM = BigInt(0x8); // ADMINISTRATOR
const MANAGE_GUILD_PERM = BigInt(0x20); // MANAGE_GUILD ("Manage Server")
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** True if the permission bitfield grants Administrator or Manage Server. */
export function canManageGuild(permissions: string): boolean {
  const p = BigInt(permissions);
  return (p & ADMIN_PERM) === ADMIN_PERM || (p & MANAGE_GUILD_PERM) === MANAGE_GUILD_PERM;
}

export type GuildEntry = {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
};
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

  const p = fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
    .then(async (res) => {
      if (!res.ok) return cache.get(accessToken)?.guilds ?? [];
      const guilds = (await res.json()) as GuildEntry[];
      cache.set(accessToken, { guilds, expiresAt: Date.now() + CACHE_TTL_MS });
      return guilds;
    })
    .finally(() => pending.delete(accessToken));

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
