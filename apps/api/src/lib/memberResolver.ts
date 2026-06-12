import { z } from "zod";

import { botHeaders, discordJson } from "./discord";

/** Dane członka rozwiązane z Discorda. `displayName` = pseudonim (nick/global), `username` = @handle. */
export type ResolvedMember = {
  displayName: string | null;
  username: string | null;
  avatar: string | null;
};

const EMPTY: ResolvedMember = { displayName: null, username: null, avatar: null };

const userSchema = z.object({
  username: z.string(),
  global_name: z.string().nullish(),
  avatar: z.string().nullish(),
});
const memberSchema = z.object({
  nick: z.string().nullish(),
  avatar: z.string().nullish(),
  user: userSchema,
});

function avatarUrl(userId: string, hash: string | null | undefined): string | null {
  return hash ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.png` : null;
}

/**
 * Tworzy resolver członków serwera z własnym cache (po userId), żeby nie odpytywać
 * Discorda wielokrotnie o ten sam ID w obrębie jednego żądania.
 *
 * Odporność na „gołe ID" w panelu:
 *  - 429 (rate-limit) → ponawiamy po `retry_after` (obsługa w `discordJson`),
 *  - 404 (członek opuścił serwer) → fallback na `GET /users/{id}`, więc nazwa i
 *    avatar nadal się rozwiążą.
 * Dopiero gdy oba zawiodą (np. konto usunięte) zwracamy null-e i panel pokaże ID.
 */
export function createMemberResolver(guildId: string, botToken: string | undefined) {
  const cache = new Map<string, ResolvedMember>();
  const headers = botToken ? botHeaders(botToken) : undefined;

  async function fetchMember(userId: string): Promise<ResolvedMember | null> {
    const m = await discordJson(`/guilds/${guildId}/members/${userId}`, memberSchema, {
      headers,
      retry: 3,
    });
    if (!m) return null;
    return {
      displayName: m.nick ?? m.user.global_name ?? m.user.username,
      username: m.user.username,
      avatar: avatarUrl(userId, m.avatar ?? m.user.avatar),
    };
  }

  // Fallback dla byłych członków — konto wciąż istnieje globalnie na Discordzie.
  async function fetchUser(userId: string): Promise<ResolvedMember | null> {
    const u = await discordJson(`/users/${userId}`, userSchema, { headers, retry: 3 });
    if (!u) return null;
    return {
      displayName: u.global_name ?? u.username,
      username: u.username,
      avatar: avatarUrl(userId, u.avatar),
    };
  }

  return async function resolve(userId?: string): Promise<ResolvedMember> {
    if (!userId) return EMPTY;

    const cached = cache.get(userId);
    if (cached) return cached;

    let resolved = EMPTY;
    if (headers) {
      resolved = (await fetchMember(userId)) ?? (await fetchUser(userId)) ?? EMPTY;
    }
    cache.set(userId, resolved);
    return resolved;
  };
}
