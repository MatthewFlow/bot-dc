import { botJobRepository, gameServerStatusRepository } from "@jurassic-haven/db";
import { Hono } from "hono";
import { z } from "zod";

import { canAccessGuild } from "../lib/guildGuard";
import { parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

export const gameServerRoutes = new Hono<{ Variables: AppVariables }>();

gameServerRoutes.use("*", authMiddleware);

gameServerRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  if (!(await canAccessGuild(c.get("accessToken"), c.get("userId"), guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});

/** Migawka starsza niż tyle = serwer/bot uznawany za offline. */
const STALE_MS = 90_000;

gameServerRoutes.get("/:guildId/gameserver", async (c) => {
  const snap = await gameServerStatusRepository.get();
  const fresh = snap.updatedAt ? Date.now() - snap.updatedAt.getTime() < STALE_MS : false;
  return c.json({
    // Czy integracja jest w ogóle aktywna (bot kiedykolwiek zapisał migawkę).
    configured: snap.updatedAt !== null,
    online: fresh && snap.online,
    name: snap.name,
    map: snap.map,
    players: snap.players,
    maxPlayers: snap.maxPlayers,
    playerList: fresh ? snap.playerList : [],
    updatedAt: snap.updatedAt?.toISOString() ?? null,
  });
});

gameServerRoutes.get("/:guildId/gameserver/announces", async (c) => {
  const guildId = c.req.param("guildId");
  return c.json(await botJobRepository.getPendingByType(guildId, "gameAnnounce"));
});

const announceBody = z.object({
  message: z.string().min(1).max(500),
  /** Zaplanuj za X minut (puste = jak najszybciej, worker bota wykona). */
  minutes: z.coerce.number().int().min(1).max(10080).optional(),
});

gameServerRoutes.post("/:guildId/gameserver/announce", async (c) => {
  const guildId = c.req.param("guildId");
  const parsed = await parseBody(c, announceBody);
  if (!parsed.ok) return parsed.res;
  const { message, minutes } = parsed.data;

  const job = await botJobRepository.create({
    guildId,
    type: "gameAnnounce",
    runAt: new Date(Date.now() + (minutes ?? 0) * 60_000),
    recurrence: "once",
    text: message,
    createdBy: c.get("userId"),
  });
  return c.json(job, 201);
});

gameServerRoutes.delete("/:guildId/gameserver/announces/:id", async (c) => {
  const ok = await botJobRepository.delete(c.req.param("id"), c.req.param("guildId"));
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});
