import { type GuildConfig, guildConfigRepository } from "@jurassic-haven/db";

const TTL_MS = 15_000;
const cache = new Map<string, { cfg: GuildConfig | null; at: number }>();

/**
 * Short-TTL cache for guild config. Used on the hot path (every message) so
 * auto-mod / XP don't hit the DB per message. Config changes apply within ~15s.
 */
export async function getCachedGuildConfig(guildId: string): Promise<GuildConfig | null> {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.cfg;

  const cfg = await guildConfigRepository.get(guildId);
  cache.set(guildId, { cfg, at: Date.now() });
  return cfg;
}

/** Drop a guild's cached config (e.g. right after a config write). */
export function invalidateGuildConfig(guildId: string): void {
  cache.delete(guildId);
}
