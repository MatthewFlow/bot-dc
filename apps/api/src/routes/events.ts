import {
  activityEventRepository,
  botStatusRepository,
  modActionRepository,
} from "@jurassic-haven/db";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";

import { verifyToken } from "../lib/auth";
import { canAccessGuild } from "../lib/guildGuard";
import type { AppVariables } from "../types";

export const eventsRoutes = new Hono<{ Variables: AppVariables }>();

/** Jak często serwer sprawdza zmiany (sygnał → klient odświeża zapytania). */
const POLL_MS = 3000;

async function statusSignal(): Promise<string> {
  const snap = await botStatusRepository.get().catch(() => null);
  return snap?.lastHeartbeat ? String(snap.lastHeartbeat.getTime()) : "";
}

async function activitySignal(guildId: string): Promise<string> {
  const [mods, events] = await Promise.all([
    modActionRepository.getRecent(guildId, 1).catch(() => []),
    activityEventRepository.getRecent(guildId, 1).catch(() => []),
  ]);
  return `${mods[0]?.id ?? ""}:${events[0]?.id ?? ""}`;
}

/**
 * Strumień zdarzeń SSE dla panelu. Wykrywa zmiany (heartbeat bota, nowa aktywność)
 * i pushuje lekki sygnał — klient odświeża istniejące zapytania TanStack Query.
 * Auth przez cookie `jh_token` (EventSource z `withCredentials`); token w query
 * jako fallback dla narzędzi, które nie ustawią cookie.
 */
eventsRoutes.get("/:guildId/events", async (c) => {
  const guildId = c.req.param("guildId");
  const token = getCookie(c, "jh_token") ?? c.req.query("token") ?? "";
  const auth = await verifyToken(token);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  if (!(await canAccessGuild(auth.accessToken, auth.userId, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return streamSSE(c, async (stream) => {
    // Zasiewamy sygnały bez pushowania — „hello" mówi klientowi, by zsynchronizował dane.
    let lastStatus = await statusSignal();
    let lastActivity = await activitySignal(guildId);
    await stream.writeSSE({ event: "hello", data: "ok" });

    while (!stream.aborted) {
      await stream.sleep(POLL_MS);
      if (stream.aborted) break;

      const status = await statusSignal();
      if (status && status !== lastStatus) {
        lastStatus = status;
        await stream.writeSSE({ event: "botStatus", data: "1" });
      }

      const activity = await activitySignal(guildId);
      if (activity !== lastActivity) {
        lastActivity = activity;
        await stream.writeSSE({ event: "activity", data: "1" });
      }
    }
  });
});
