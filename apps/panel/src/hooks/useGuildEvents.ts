"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { queryKeys } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

/**
 * Subskrybuje strumień SSE serwera i odświeża zapytania na push (real-time zamiast
 * pollingu). Serwer wysyła lekkie sygnały — tu zamieniamy je na invalidację zapytań,
 * więc dane lecą przez istniejące endpointy. Polling hooków zostaje jako fallback,
 * gdyby SSE padło. Mountowane raz w layoucie serwera.
 *
 * `enabled` gatuje subskrypcję do momentu potwierdzenia dostępu do serwera —
 * inaczej EventSource odpaliłby do `/events`, na które bramka API zwróci 403.
 */
export function useGuildEvents(guildId: string, enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!guildId || !enabled) return;

    const es = new EventSource(`${API_URL}/guilds/${guildId}/events`, {
      withCredentials: true,
    });

    const refreshActivity = () =>
      qc.invalidateQueries({ queryKey: ["activity", guildId] });
    const refreshStatus = () => qc.invalidateQueries({ queryKey: queryKeys.botStatus() });

    es.addEventListener("activity", refreshActivity);
    es.addEventListener("botStatus", refreshStatus);
    es.addEventListener("hello", () => {
      refreshActivity();
      refreshStatus();
    });

    return () => es.close();
  }, [guildId, enabled, qc]);
}
