const DISCORD_API = "https://discord.com/api/v10";

/** Dane członka rozwiązane z Discorda. `displayName` = pseudonim (nick/global), `username` = @handle. */
export type ResolvedMember = {
  displayName: string | null;
  username: string | null;
  avatar: string | null;
};

const EMPTY: ResolvedMember = { displayName: null, username: null, avatar: null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function avatarUrl(userId: string, hash: string | null | undefined): string | null {
  return hash ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.png` : null;
}

/**
 * GET do Discorda z obsługą rate-limitu (429): czeka `retry_after` i ponawia
 * (do `maxRetries`). Zwraca `Response` (także nie-2xx) albo `null` przy błędzie sieci.
 */
async function discordGet(
  url: string,
  botToken: string,
  maxRetries = 3,
): Promise<Response | null> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Authorization: `Bot ${botToken}` } });
    } catch {
      return null;
    }
    if (res.status === 429 && attempt < maxRetries) {
      const body = (await res.json().catch(() => null)) as {
        retry_after?: number;
      } | null;
      // retry_after w sekundach; klamra na wypadek dziwnych wartości.
      await sleep(Math.min(Math.max((body?.retry_after ?? 1) * 1000, 200), 5000));
      continue;
    }
    return res;
  }
}

/**
 * Tworzy resolver członków serwera z własnym cache (po userId), żeby nie odpytywać
 * Discorda wielokrotnie o ten sam ID w obrębie jednego żądania.
 *
 * Odporność na „gołe ID" w panelu:
 *  - 429 (rate-limit) → ponawiamy po `retry_after`,
 *  - 404 (członek opuścił serwer) → fallback na `GET /users/{id}`, więc nazwa i
 *    avatar nadal się rozwiążą.
 * Dopiero gdy oba zawiodą (np. konto usunięte) zwracamy null-e i panel pokaże ID.
 */
export function createMemberResolver(guildId: string, botToken: string | undefined) {
  const cache = new Map<string, ResolvedMember>();

  async function fetchMember(userId: string): Promise<ResolvedMember | null> {
    const res = await discordGet(
      `${DISCORD_API}/guilds/${guildId}/members/${userId}`,
      botToken!,
    );
    if (!res || !res.ok) return null;
    const member = (await res.json().catch(() => null)) as {
      nick?: string | null;
      avatar: string | null;
      user: { username: string; global_name?: string | null; avatar: string | null };
    } | null;
    if (!member) return null;
    return {
      displayName: member.nick ?? member.user.global_name ?? member.user.username,
      username: member.user.username,
      avatar: avatarUrl(userId, member.avatar ?? member.user.avatar),
    };
  }

  // Fallback dla byłych członków — konto wciąż istnieje globalnie na Discordzie.
  async function fetchUser(userId: string): Promise<ResolvedMember | null> {
    const res = await discordGet(`${DISCORD_API}/users/${userId}`, botToken!);
    if (!res || !res.ok) return null;
    const user = (await res.json().catch(() => null)) as {
      username: string;
      global_name?: string | null;
      avatar: string | null;
    } | null;
    if (!user) return null;
    return {
      displayName: user.global_name ?? user.username,
      username: user.username,
      avatar: avatarUrl(userId, user.avatar),
    };
  }

  return async function resolve(userId?: string): Promise<ResolvedMember> {
    if (!userId) return EMPTY;

    const cached = cache.get(userId);
    if (cached) return cached;

    let resolved = EMPTY;
    if (botToken) {
      resolved = (await fetchMember(userId)) ?? (await fetchUser(userId)) ?? EMPTY;
    }
    cache.set(userId, resolved);
    return resolved;
  };
}
