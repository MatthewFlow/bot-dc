import {
  guildConfigRepository,
  modActionRepository,
  ticketRepository,
  warnRepository,
} from "@jurassic-haven/db";
import { Hono } from "hono";

import { canAccessGuild } from "../lib/guildGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const DISCORD_API = "https://discord.com/api/v10";

/** Dane członka rozwiązane z Discorda. `displayName` = pseudonim (nick/global), `username` = @handle. */
type ResolvedMember = {
  displayName: string | null;
  username: string | null;
  avatar: string | null;
};

/**
 * Tworzy resolver członków serwera z własnym cache (po userId), żeby nie odpytywać
 * Discorda wielokrotnie o ten sam ID. Best-effort — przy błędzie zwraca null-e,
 * a panel pokaże fallback (ID).
 */
function createMemberResolver(guildId: string, botToken: string | undefined) {
  const cache = new Map<string, ResolvedMember>();

  return async function resolve(userId?: string): Promise<ResolvedMember> {
    const empty: ResolvedMember = { displayName: null, username: null, avatar: null };
    if (!userId) return empty;

    const cached = cache.get(userId);
    if (cached) return cached;

    let resolved = empty;
    if (botToken) {
      try {
        const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, {
          headers: { Authorization: `Bot ${botToken}` },
        });
        if (res.ok) {
          const member = (await res.json()) as {
            nick?: string | null;
            avatar: string | null;
            user: {
              username: string;
              global_name?: string | null;
              avatar: string | null;
            };
          };
          const displayName =
            member.nick ?? member.user.global_name ?? member.user.username;
          const avatarHash = member.avatar ?? member.user.avatar;
          resolved = {
            displayName,
            username: member.user.username,
            avatar: avatarHash
              ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
              : null,
          };
        }
      } catch {
        // ignore — zostawiamy null-e, panel pokaże fallback (ID)
      }
    }
    cache.set(userId, resolved);
    return resolved;
  };
}

/** Loguje zdarzenie ticketu na kanał logów (jeśli ustawiony). Best-effort. */
async function postTicketLog(
  guildId: string,
  event: "close" | "reopen" | "delete",
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
      : event === "reopen"
        ? { title: "🔓 Ticket otwarty ponownie (z panelu)", color: 0x22c55e }
        : { title: "🗑️ Ticket usunięty (z panelu)", color: 0xef4444 };

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
  const userId = c.get("userId");

  if (!(await canAccessGuild(accessToken, userId, guildId))) {
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

  // Wzbogacamy o pseudonim (display name), nazwę (@handle) i avatar ukaranego
  // użytkownika — best-effort, z cache po ID.
  const resolve = createMemberResolver(guildId, process.env.DISCORD_TOKEN);
  const uniqueIds = [...new Set(actions.map((a) => a.userId))];
  await Promise.all(uniqueIds.map((id) => resolve(id)));

  const enriched = await Promise.all(
    actions.map(async (a) => {
      const m = await resolve(a.userId);
      return {
        ...a,
        displayName: m.displayName,
        username: m.username,
        avatar: m.avatar,
      };
    }),
  );

  return c.json(enriched);
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
  // best-effort, z cache po ID.
  const resolve = createMemberResolver(guildId, process.env.DISCORD_TOKEN);
  const uniqueIds = [
    ...new Set(
      tickets.flatMap((t) =>
        [t.userId, t.assignedTo].filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  const resolved = new Map<string, ResolvedMember>();
  await Promise.all(uniqueIds.map(async (id) => resolved.set(id, await resolve(id))));

  const enriched = tickets.map((t) => {
    const author = resolved.get(t.userId);
    return {
      ...t,
      username: author?.displayName ?? null,
      userTag: author?.username ?? null,
      avatar: author?.avatar ?? null,
      assignedToUsername: t.assignedTo
        ? (resolved.get(t.assignedTo)?.displayName ?? null)
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

moderationRoutes.delete("/:guildId/tickets/:threadId", async (c) => {
  const guildId = c.req.param("guildId");
  const threadId = c.req.param("threadId");
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return c.json({ error: "Missing bot token" }, 500);

  const ticket = await ticketRepository.getByThread(threadId);
  if (!ticket || ticket.guildId !== guildId) return c.json({ error: "Not found" }, 404);

  // Log przed usunięciem (wzmianka o wątku jeszcze się rozwiąże), potem usuń wątek + wpis.
  await postTicketLog(
    guildId,
    "delete",
    ticket.userId,
    threadId,
    c.get("userId"),
    botToken,
  );

  // Usuń wątek na Discordzie (best-effort — mógł już zostać usunięty ręcznie).
  await fetch(`${DISCORD_API}/channels/${threadId}`, {
    method: "DELETE",
    headers: { Authorization: `Bot ${botToken}` },
  }).catch(() => {});

  await ticketRepository.delete(threadId);
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
