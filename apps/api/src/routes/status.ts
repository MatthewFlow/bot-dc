import { botStatusRepository } from "@jurassic-haven/db";
import { Hono } from "hono";

import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

/** Heartbeat starszy niż tyle ms = bot uznawany za offline (3 nieudane bicia po 30 s). */
const STALE_MS = 90_000;

export const statusRoutes = new Hono<{ Variables: AppVariables }>();

statusRoutes.use("*", authMiddleware);

statusRoutes.get("/status", async (c) => {
  const snap = await botStatusRepository.get();
  const lastMs = snap.lastHeartbeat ? snap.lastHeartbeat.getTime() : 0;
  const online = lastMs > 0 && Date.now() - lastMs < STALE_MS;

  return c.json({
    online,
    username: snap.username,
    avatar: snap.avatar,
    guildCount: snap.guildCount,
    version: snap.version,
    ping: snap.ping,
    startedAt: snap.startedAt ? snap.startedAt.toISOString() : null,
    lastSeen: snap.lastHeartbeat ? snap.lastHeartbeat.toISOString() : null,
  });
});
