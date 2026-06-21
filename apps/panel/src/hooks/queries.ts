"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchChannels,
  fetchGuildConfig,
  fetchGuildStats,
  fetchLeaderboard,
  fetchRoles,
  getActivePunishments,
  getActivity,
  getBotStatus,
  getButtonRoles,
  getGuildFeedback,
  getMemberHistory,
  getMemberProfile,
  getModActions,
  getModStats,
  getReactionRoles,
  getTickets,
  getWarnings,
  queryKeys,
  searchMembers,
  type TicketStatus,
} from "@/lib/api";

/**
 * Współdzielone hooki odczytu oparte o TanStack Query. Używają surowych fetcherów
 * (`fetch*`) jako queryFn — nie gettery swr — by uniknąć rekurencji na tym samym
 * kluczu. Klucze pochodzą z `queryKeys`, więc cache jest spójny z warstwą api.ts.
 */

export function useGuildConfig(guildId: string) {
  return useQuery({
    queryKey: queryKeys.config(guildId),
    queryFn: () => fetchGuildConfig(guildId),
  });
}

export function useChannels(guildId: string) {
  return useQuery({
    queryKey: queryKeys.channels(guildId),
    queryFn: () => fetchChannels(guildId),
  });
}

export function useRoles(guildId: string) {
  return useQuery({
    queryKey: queryKeys.roles(guildId),
    queryFn: () => fetchRoles(guildId),
  });
}

export function useLeaderboard(guildId: string, limit = 10) {
  return useQuery({
    queryKey: queryKeys.leaderboard(guildId, limit),
    queryFn: () => fetchLeaderboard(guildId, limit),
  });
}

export function useTickets(guildId: string, status?: TicketStatus) {
  return useQuery({
    queryKey: queryKeys.tickets(guildId, status),
    queryFn: () => getTickets(guildId, status),
  });
}

export function useModActions(guildId: string, limit = 25) {
  return useQuery({
    queryKey: queryKeys.modActions(guildId, limit),
    queryFn: () => getModActions(guildId, limit),
  });
}

export function useModStats(guildId: string) {
  return useQuery({
    queryKey: queryKeys.modStats(guildId),
    queryFn: () => getModStats(guildId),
    // Pasek statystyk odpytuje Discorda (lista członków) — nie refetchuj na każdy focus.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useActivePunishments(guildId: string) {
  return useQuery({
    queryKey: queryKeys.activePunishments(guildId),
    queryFn: () => getActivePunishments(guildId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useWarnings(guildId: string, userId: string | null) {
  return useQuery({
    queryKey: queryKeys.warnings(guildId, userId ?? ""),
    queryFn: () => getWarnings(guildId, userId as string),
    enabled: Boolean(userId),
  });
}

export function useMemberHistory(guildId: string, userId: string | null) {
  return useQuery({
    queryKey: queryKeys.memberHistory(guildId, userId ?? ""),
    queryFn: () => getMemberHistory(guildId, userId as string),
    enabled: Boolean(userId),
  });
}

export function useMemberProfile(guildId: string, userId: string | null) {
  return useQuery({
    queryKey: queryKeys.memberProfile(guildId, userId ?? ""),
    queryFn: () => getMemberProfile(guildId, userId as string),
    enabled: Boolean(userId),
  });
}

/** Wyszukiwanie członka po nazwie/nicku/ID — odpalane dopiero gdy `q` ma ≥2 znaki. */
export function useMemberSearch(guildId: string, q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: queryKeys.memberSearch(guildId, query),
    queryFn: () => searchMembers(guildId, query),
    enabled: query.length >= 2,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Status bota (jeden współdzielony klucz dla całej apki). `poll` włącza odświeżanie
 * co 30 s (TopBar badge, karta „Informacje o bocie"); bez niego wystarcza 60 s świeżości.
 */
export function useBotStatus(poll = false) {
  return useQuery({
    queryKey: queryKeys.botStatus(),
    queryFn: getBotStatus,
    staleTime: poll ? 30_000 : 60_000,
    refetchInterval: poll ? 30_000 : undefined,
  });
}

export function useGuildStats(guildId: string) {
  return useQuery({
    queryKey: queryKeys.stats(guildId),
    queryFn: () => fetchGuildStats(guildId),
    staleTime: 30_000,
  });
}

/** Feed „Aktywność na żywo" — odświeżany co 20 s (stąd badge „LIVE"). */
export function useActivity(guildId: string, limit = 8) {
  return useQuery({
    queryKey: queryKeys.activity(guildId, limit),
    queryFn: () => getActivity(guildId, limit),
    refetchInterval: 20_000,
    staleTime: 20_000,
  });
}

export function useReactionRoles(guildId: string) {
  return useQuery({
    queryKey: queryKeys.reactionRoles(guildId),
    queryFn: () => getReactionRoles(guildId),
  });
}

export function useButtonRoles(guildId: string) {
  return useQuery({
    queryKey: queryKeys.buttonRoles(guildId),
    queryFn: () => getButtonRoles(guildId),
  });
}

export function useGuildFeedback(guildId: string) {
  return useQuery({
    queryKey: queryKeys.guildFeedback(guildId),
    queryFn: () => getGuildFeedback(guildId),
    // Lista feedbacku potrafi odpalić enrichment z Discorda po stronie API — nie
    // refetchuj jej przy każdym powrocie/refocusie. 30 s świeżości + jawny „Odśwież".
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
