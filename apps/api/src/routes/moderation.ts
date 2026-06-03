import {
  guildConfigRepository,
  modActionRepository,
  ticketRepository,
  warnRepository,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { isGuildAdmin } from "../lib/guildGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";

/** Loguje zdarzenie ticketu na kanał logów (jeśli ustawiony). Best-effort. */
async function postTicketLog(
  guildId: string,
  event: "close" | "reopen",
  ticketUserId: string,
  threadId: string,
  actorId: string,
  botToken: string,
) {
  const cfg = await guildConfigRepository.get(guildId);
  if (!cfg?.ticketLogChannelId) return;

  const meta =
    event === "close"
      ? { title: "🔒 Ticket zamknięty (z panelu)", color: 0x6b7280 }
      : { title: "🔓 Ticket otwarty ponownie (z panelu)", color: 0x22c55e };

  await fetch(`${DISCORD_API}/channels/${cfg.ticketLogChannelId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: meta.title,
          color: meta.color,
          description: `Wątek <#${threadId}> · użytkownik <@${ticketUserId}> · akcja przez <@${actorId}>`,
        },
      ],
    }),
  }).catch(() => {});
}

export const moderationRoutes = new Hono<{ Variables: AppVariables }>();

moderationRoutes.use("*", authMiddleware);

moderationRoutes.use("/:guildId/*", async (c, next) => {
  const guildId = c.req.param("guildId");
  const accessToken = c.get("accessToken");

  if (!(await isGuildAdmin(accessToken, guildId))) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await next();
});

moderationRoutes.get("/:guildId/warnings/:userId", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.req.param("userId");
  const warns = await warnRepository.getAll(guildId, userId);
  return c.json(warns);
});

moderationRoutes.delete("/:guildId/warnings/:userId", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.req.param("userId");
  const deleted = await warnRepository.clear(guildId, userId);
  return c.json({ deleted });
});

moderationRoutes.get("/:guildId/mod-actions", async (c) => {
  const guildId = c.req.param("guildId");
  const raw = Number(c.req.query("limit") ?? 25);
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 25;
  const actions = await modActionRepository.getRecent(guildId, limit);
  return c.json(actions);
});

moderationRoutes.get("/:guildId/tickets", async (c) => {
  const guildId = c.req.param("guildId");
  const rawStatus = c.req.query("status");
  const status =
    rawStatus === "pending" || rawStatus === "open" || rawStatus === "closed"
      ? rawStatus
      : undefined;
  const tickets = await ticketRepository.getAll(guildId, status);

  // Wzbogacamy o nazwy i avatary użytkowników (autor + osoba, która przejęła) —
  // best-effort. Cache po unikalnym ID, żeby nie odpytywać Discorda wielokrotnie.
  const botToken = process.env.DISCORD_TOKEN;
  type ResolvedMember = { name: string | null; avatar: string | null };
  const memberCache = new Map<string, ResolvedMember>();

  async function resolveMember(userId?: string): Promise<ResolvedMember> {
    if (!userId) return { name: null, avatar: null };
    const cached = memberCache.get(userId);
    if (cached) return cached;

    let resolved: ResolvedMember = { name: null, avatar: null };
    if (botToken) {
      try {
        const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (res.ok) {
          const member = (await res.json()) as {
            nick?: string;
            avatar: string | null;
            user: {
              username: string;
              global_name?: string | null;
              avatar: string | null;
            };
          };
          const name = member.nick ?? member.user.global_name ?? member.user.username;
          const avatarHash = member.avatar ?? member.user.avatar;
          const avatar = avatarHash
            ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
            : null;
          resolved = { name, avatar };
        }
      } catch {
        // ignore — zostawiamy null, panel pokaże fallback (ID)
      }
    }
    memberCache.set(userId, resolved);
    return resolved;
  }

  const uniqueIds = [
    ...new Set(
      tickets.flatMap((t) =>
        [t.userId, t.assignedTo].filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  await Promise.all(uniqueIds.map((id) => resolveMember(id)));

  const enriched = tickets.map((t) => {
    const author = memberCache.get(t.userId);
    return {
      ...t,
      username: author?.name ?? null,
      avatar: author?.avatar ?? null,
      assignedToUsername: t.assignedTo
        ? (memberCache.get(t.assignedTo)?.name ?? null)
        : null,
    };
  });

  return c.json(enriched);
});

moderationRoutes.post("/:guildId/tickets/:threadId/close", async (c) => {
  const guildId = c.req.param("guildId");
  const threadId = c.req.param("threadId");
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const ticket = await ticketRepository.getByThread(threadId);
  if (!ticket || ticket.guildId !== guildId) return c.json({ error: "Not found" }, 404);
  if (ticket.status === "closed") return c.json({ error: "Already closed" }, 400);

  // Lock + archiwizacja wątku (best-effort — wątek mógł zostać usunięty ręcznie)
  await fetch(`${DISCORD_API}/channels/${threadId}`, {
    method: "PATCH",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ archived: true, locked: true }),
  }).catch(() => {});

  await ticketRepository.close(threadId);
  await postTicketLog(
    guildId,
    "close",
    ticket.userId,
    threadId,
    c.get("userId"),
    botToken,
  );

  return c.json({ ok: true });
});

moderationRoutes.post("/:guildId/tickets/:threadId/reopen", async (c) => {
  const guildId = c.req.param("guildId");
  const threadId = c.req.param("threadId");
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const ticket = await ticketRepository.getByThread(threadId);
  if (!ticket || ticket.guildId !== guildId) return c.json({ error: "Not found" }, 404);
  if (ticket.status !== "closed") return c.json({ error: "Not closed" }, 400);

  const res = await fetch(`${DISCORD_API}/channels/${threadId}`, {
    method: "PATCH",
    headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ archived: false, locked: false }),
  }).catch(() => null);

  // Jeśli wątek nie istnieje, nie da się go otworzyć ponownie
  if (!res || !res.ok) {
    return c.json({ error: "Thread unavailable" }, 502);
  }

  await ticketRepository.reopen(threadId);
  await postTicketLog(
    guildId,
    "reopen",
    ticket.userId,
    threadId,
    c.get("userId"),
    botToken,
  );

  return c.json({ ok: true });
});
