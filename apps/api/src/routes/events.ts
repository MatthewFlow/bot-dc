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

// ── Wspólny poller ───────────────────────────────────────────────────────────
// Zamiast osobnej pętli odpytującej bazę w KAŻDYM połączeniu SSE (N klientów ×
// 2 zapytania / POLL_MS), jeden globalny tick liczy sygnał statusu raz i sygnał
// aktywności raz na każdą gildię, która ma subskrybenta — po czym broadcastuje
// do odpowiednich strumieni. Działa tylko gdy jest ≥1 subskrybent.

type EventName = "botStatus" | "activity";
type Subscriber = { guildId: string; push: (event: EventName) => void };

const subscribers = new Set<Subscriber>();
/** Ostatni sygnał heartbeatu (globalny) — `null` = jeszcze nie zaseedowany. */
let lastStatus: string | null = null;
/** Ostatni sygnał aktywności per gildia (tylko gildie z subskrybentem). */
const lastActivity = new Map<string, string>();
let timer: ReturnType<typeof setInterval> | null = null;

function guildHasSubscribers(guildId: string): boolean {
  for (const sub of subscribers) if (sub.guildId === guildId) return true;
  return false;
}

async function pollOnce(): Promise<void> {
  // Status bota — wspólny dla wszystkich klientów: jedno zapytanie na tick.
  const status = await statusSignal();
  if (status && status !== lastStatus) {
    lastStatus = status;
    for (const sub of subscribers) sub.push("botStatus");
  }

  // Aktywność — jedno zapytanie na gildię z subskrybentem (nie per klient).
  const guildIds = new Set<string>();
  for (const sub of subscribers) guildIds.add(sub.guildId);
  for (const guildId of guildIds) {
    const activity = await activitySignal(guildId);
    const prev = lastActivity.get(guildId);
    if (prev === undefined) {
      lastActivity.set(guildId, activity);
      continue;
    }
    if (activity !== prev) {
      lastActivity.set(guildId, activity);
      for (const sub of subscribers) {
        if (sub.guildId === guildId) sub.push("activity");
      }
    }
  }
}

function ensurePoller(): void {
  if (timer) return;
  timer = setInterval(() => void pollOnce(), POLL_MS);
  timer.unref?.();
}

function maybeStopPoller(): void {
  if (subscribers.size === 0 && timer) {
    clearInterval(timer);
    timer = null;
  }
}

/**
 * Strumień zdarzeń SSE dla panelu. Wykrywa zmiany (heartbeat bota, nowa aktywność)
 * i pushuje lekki sygnał — klient odświeża istniejące zapytania TanStack Query.
 * Auth WYŁĄCZNIE przez cookie `jh_token` (EventSource z `withCredentials`; produkcja
 * jest same-origin za Caddym, więc cookie leci z requestem). Świadomie BEZ fallbacku
 * `?token=` w query — 7-dniowy JWT w URL wyciekłby do logów proxy/historii.
 */
eventsRoutes.get("/:guildId/events", async (c) => {
  const guildId = c.req.param("guildId");
  const token = getCookie(c, "jh_token") ?? "";
  const auth = await verifyToken(token);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  if (!(await canAccessGuild(auth.accessToken, auth.userId, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  return streamSSE(c, async (stream) => {
    // Seedujemy bazowe sygnały, by zmiana między połączeniem a pierwszym tickiem
    // nie umknęła (klient i tak synchronizuje dane na „hello").
    if (lastStatus === null) lastStatus = await statusSignal();
    if (!lastActivity.has(guildId)) {
      lastActivity.set(guildId, await activitySignal(guildId));
    }

    await stream.writeSSE({ event: "hello", data: "ok" });

    const sub: Subscriber = {
      guildId,
      push: (event) => {
        if (!stream.aborted) void stream.writeSSE({ event, data: "1" }).catch(() => {});
      },
    };
    subscribers.add(sub);
    ensurePoller();

    // Utrzymujemy połączenie otwarte; cały odczyt robi wspólny poller.
    while (!stream.aborted) {
      await stream.sleep(POLL_MS);
    }

    subscribers.delete(sub);
    // Ostatni subskrybent gildii wyszedł — czyścimy jej baseline (re-seed przy
    // następnym połączeniu) i zatrzymujemy poller, gdy nikt nie słucha.
    if (!guildHasSubscribers(guildId)) lastActivity.delete(guildId);
    maybeStopPoller();
  });
});
