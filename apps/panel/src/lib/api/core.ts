import { queryClient } from "../queryClient";
import type { TicketStatus } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export class TokenExpiredError extends Error {
  constructor() {
    super("Token expired");
    this.name = "TokenExpiredError";
  }
}

export function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    window.location.href = "/";
    throw new TokenExpiredError();
  }
}

export const BASE: RequestInit = { credentials: "include" };

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  const res = await fetch(url, { ...BASE, ...options });

  if (res.status === 401) handleUnauthorized(res);

  if (res.status === 429 && retries > 0) {
    const data = (await res.clone().json()) as { retry_after?: number };
    const delay = (data.retry_after ?? 1) * 1000;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1);
  }

  return res;
}

// ── Warstwa cache odczytów — magazynem jest TanStack Query ───────────────────
// Config/role/kanały rzadko się zmieniają, a role/channels proxują do Discorda
// (wolno). `swr` zachowuje dotychczasowy UX: jeśli coś jest w cache, zwraca to
// NATYCHMIAST (także nieświeże) i odświeża w tle; pierwszy odczyt (pusty cache)
// czeka na sieć. Dedup współbieżnych odczytów daje `queryClient.fetchQuery`.
const STALE_MS = 300_000;

/** Fabryka kluczy zapytań — wspólna dla fetcherów (poniżej) i hooków useQuery. */
export const queryKeys = {
  me: () => ["me"] as const,
  guilds: () => ["guilds"] as const,
  config: (g: string) => ["config", g] as const,
  channels: (g: string) => ["channels", g] as const,
  roles: (g: string) => ["roles", g] as const,
  leaderboard: (g: string, limit: number) => ["leaderboard", g, limit] as const,
  stats: (g: string) => ["stats", g] as const,
  reactionRoles: (g: string) => ["reaction-roles", g] as const,
  buttonRoles: (g: string) => ["button-roles", g] as const,
  tickets: (g: string, status?: TicketStatus) => ["tickets", g, status ?? "all"] as const,
  modActions: (g: string, limit: number) => ["mod-actions", g, limit] as const,
  activity: (g: string, limit: number) => ["activity", g, limit] as const,
  modStats: (g: string) => ["mod-stats", g] as const,
  activePunishments: (g: string) => ["active-punishments", g] as const,
  memberHistory: (g: string, userId: string) => ["member-history", g, userId] as const,
  memberProfile: (g: string, userId: string) => ["member-profile", g, userId] as const,
  memberSearch: (g: string, q: string) => ["member-search", g, q] as const,
  warnings: (g: string, userId: string) => ["warnings", g, userId] as const,
  botStatus: () => ["bot-status"] as const,
  adminOverview: () => ["admin-overview"] as const,
  configAudit: (g: string) => ["config-audit", g] as const,
  jobs: (g: string) => ["jobs", g] as const,
  gameServer: (g: string) => ["gameserver", g] as const,
  gameAnnounces: (g: string) => ["game-announces", g] as const,
  guildFeedback: (g: string) => ["guild-feedback", g] as const,
  myFeedback: () => ["my-feedback"] as const,
};

export function swr<T>(key: readonly unknown[], fetcher: () => Promise<T>): Promise<T> {
  const cached = queryClient.getQueryData<T>(key);
  if (cached !== undefined) {
    const state = queryClient.getQueryState(key);
    const stale = !state || Date.now() - state.dataUpdatedAt >= STALE_MS;
    if (stale) {
      void queryClient
        .fetchQuery({ queryKey: key, queryFn: fetcher, staleTime: STALE_MS })
        .catch(() => {});
    }
    return Promise.resolve(cached);
  }
  return queryClient.fetchQuery({ queryKey: key, queryFn: fetcher, staleTime: STALE_MS });
}

/**
 * Oznacza odczyty serwera jako nieświeże po mutacji (jeden rodzaj albo
 * config+channels+roles). Używa `invalidateQueries`, nie `removeQueries`:
 * aktywni obserwatorzy zachowują bieżące dane i odświeżają je w tle (bez
 * powrotu do `isLoading` → bez migania skeletonem strony po zapisie).
 */
export function invalidateGuildCache(
  guildId: string,
  kind?: "config" | "channels" | "roles",
): void {
  const keys: readonly (readonly unknown[])[] = kind
    ? [[kind, guildId]]
    : [queryKeys.config(guildId), queryKeys.channels(guildId), queryKeys.roles(guildId)];
  for (const key of keys) void queryClient.invalidateQueries({ queryKey: key });
}
