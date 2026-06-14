"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchChannels,
  fetchGuildConfig,
  fetchLeaderboard,
  fetchRoles,
  getButtonRoles,
  getGuildFeedback,
  getModActions,
  getReactionRoles,
  getTickets,
  queryKeys,
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
