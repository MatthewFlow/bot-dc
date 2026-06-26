import { type StickyMessage, stickyMessageRepository } from "@jurassic-haven/db";

const TTL_MS = 30_000;
// guildId -> { sticky configs, loaded at `at` }.
const cache = new Map<string, { stickies: StickyMessage[]; at: number }>();

/**
 * Konfiguracje sticky dla serwera z 30 s cache per-guild — `messageCreate` jest
 * „gorący", więc zwykłe wiadomości (większość) nie dotykają DB; tylko kanały ze
 * sticky schodzą dalej do repostu. Zmiany z panelu (inny proces) wchodzą w życie
 * w ciągu jednego okna TTL.
 */
export async function getGuildStickies(guildId: string): Promise<StickyMessage[]> {
  const hit = cache.get(guildId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.stickies;

  const stickies = await stickyMessageRepository.getByGuild(guildId);
  cache.set(guildId, { stickies, at: Date.now() });
  return stickies;
}
