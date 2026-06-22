import { queryClient } from "../queryClient";
import {
  API_URL,
  BASE,
  fetchWithRetry,
  handleUnauthorized,
  invalidateGuildCache,
  queryKeys,
  swr,
} from "./core";
import type {
  ActivityItem,
  Channel,
  ConfigAuditEntry,
  GuildConfig,
  GuildConfigUpdate,
  GuildStats,
  LeaderboardEntry,
  Role,
} from "./types";

/** Surowy fetcher (bez cache) — queryFn dla useQuery; imperatywnie używaj getGuildConfig. */
export async function fetchGuildConfig(guildId: string): Promise<GuildConfig> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, BASE);
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to fetch config");
  return (await res.json()) as GuildConfig;
}

export function getGuildConfig(guildId: string): Promise<GuildConfig> {
  return swr(queryKeys.config(guildId), () => fetchGuildConfig(guildId));
}

export async function updateGuildConfig(
  guildId: string,
  patch: GuildConfigUpdate,
): Promise<void> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, {
    ...BASE,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to update config");
  invalidateGuildCache(guildId, "config");
}

/** Surowy fetcher (bez cache) — queryFn dla useQuery; imperatywnie używaj getChannels. */
export async function fetchChannels(guildId: string): Promise<Channel[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/channels`);
  if (!res.ok) throw new Error("Failed to fetch channels");
  return (await res.json()) as Channel[];
}

export function getChannels(guildId: string): Promise<Channel[]> {
  return swr(queryKeys.channels(guildId), () => fetchChannels(guildId));
}

/** Surowy fetcher (bez cache) — queryFn dla useQuery; imperatywnie używaj getRoles. */
export async function fetchRoles(guildId: string): Promise<Role[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/roles`);
  if (!res.ok) throw new Error("Failed to fetch roles");
  return (await res.json()) as Role[];
}

export function getRoles(guildId: string): Promise<Role[]> {
  return swr(queryKeys.roles(guildId), () => fetchRoles(guildId));
}

/**
 * Rozgrzewa cache współdzielony (config + role + kanały) dla serwera, żeby kolejne
 * wejścia na podstrony były natychmiastowe. Fire-and-forget — błędy ujawnią się
 * dopiero, gdy dana strona faktycznie poprosi o te dane.
 */
export function prefetchGuildData(guildId: string): void {
  void getGuildConfig(guildId).catch(() => {});
  void getChannels(guildId).catch(() => {});
  void getRoles(guildId).catch(() => {});
}

export async function createChannel(guildId: string, name: string): Promise<Channel> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create channel");
  invalidateGuildCache(guildId, "channels");
  return res.json();
}

export async function createRole(guildId: string, name: string): Promise<Role> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create role");
  invalidateGuildCache(guildId, "roles");
  return res.json();
}

/** Surowy fetcher (bez cache) — używany jako queryFn w useQuery, by uniknąć
 *  rekurencji swr→fetchQuery na tym samym kluczu. Imperatywnie używaj getLeaderboard. */
export async function fetchLeaderboard(
  guildId: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/leaderboard?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return (await res.json()) as LeaderboardEntry[];
}

export function getLeaderboard(
  guildId: string,
  limit = 10,
  force = false,
): Promise<LeaderboardEntry[]> {
  const key = queryKeys.leaderboard(guildId, limit);
  if (force) queryClient.removeQueries({ queryKey: key });
  return swr(key, () => fetchLeaderboard(guildId, limit));
}

export async function getActivity(guildId: string, limit = 8): Promise<ActivityItem[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/activity?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export async function getConfigAudit(
  guildId: string,
  limit = 15,
): Promise<ConfigAuditEntry[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/config-audit?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch config audit");
  return res.json();
}

/** Surowy fetcher (bez cache) — queryFn dla useQuery (patrz fetchLeaderboard). */
export async function fetchGuildStats(guildId: string): Promise<GuildStats> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch guild stats");
  return (await res.json()) as GuildStats;
}

export function getGuildStats(guildId: string): Promise<GuildStats> {
  return swr(queryKeys.stats(guildId), () => fetchGuildStats(guildId));
}
