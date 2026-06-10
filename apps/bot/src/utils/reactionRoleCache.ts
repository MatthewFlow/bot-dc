import { reactionRoleRepository } from "@jurassic-haven/db";

const TTL_MS = 60_000;
// guildId -> { set of reaction-role panel message IDs, loaded at `at` }.
const cache = new Map<string, { ids: Set<string>; at: number }>();

async function getTrackedIds(guildId: string): Promise<Set<string>> {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.ids;

  const ids = new Set(await reactionRoleRepository.getMessageIdsByGuild(guildId));
  cache.set(guildId, { ids, at: Date.now() });
  return ids;
}

/**
 * True if the message is a reaction-role panel. Answered from a 60s per-guild
 * cache so ordinary reactions (the overwhelming majority) never touch the DB —
 * only reactions on actual panels fall through to a full config lookup.
 *
 * Panels are created/deleted by the API (separate process), so a freshly created
 * panel becomes live within one TTL window rather than instantly — acceptable
 * since real users rarely react in the first minute after setup.
 */
export async function isReactionRoleMessage(
  guildId: string,
  messageId: string,
): Promise<boolean> {
  return (await getTrackedIds(guildId)).has(messageId);
}
