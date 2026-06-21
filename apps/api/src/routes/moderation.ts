import {
  botJobRepository,
  guildConfigRepository,
  levelFromXp,
  modActionRepository,
  ticketRepository,
  warnRepository,
  xpRepository,
} from "@jurassic-haven/db";
import { type Context, Hono } from "hono";
import { z } from "zod";

import {
  botHeaders,
  DISCORD_API,
  discordFetch,
  discordJson,
  fetchGuildCounts,
  requireBotToken,
} from "../lib/discord";
import { canAccessGuild } from "../lib/guildGuard";
import { createMemberResolver, type ResolvedMember } from "../lib/memberResolver";
import { logModAction, sendPunishDm } from "../lib/modActions";
import { idSchema, parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

/** Buduje URL avatara z CDN Discorda (lub `null`, gdy użytkownik go nie ma). */
function avatarUrl(userId: string, hash: string | null | undefined): string | null {
  return hash ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.png` : null;
}

const DEFAULT_REASON = "Brak powodu";

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
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
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

// ── Akcje moderacyjne wykonywane z panelu ─────────────────────────────────────
// Moderatorem jest zalogowany użytkownik panelu. Każda akcja: (1) wykonuje operację
// na Discordzie przez bot token, (2) zapisuje audyt + embed na kanał logów
// (`logModAction`), (3) opcjonalnie wysyła DM karanemu (`dmOnPunish`).

const reasonField = z.string().trim().max(512).optional();
const warnBody = z.object({ userId: idSchema, reason: reasonField });
const muteBody = z.object({
  userId: idSchema,
  // 1 min – 28 dni (limit timeoutu Discorda).
  minutes: z.coerce.number().int().min(1).max(40_320),
  reason: reasonField,
});
const kickBody = z.object({ userId: idSchema, reason: reasonField });
const banBody = z.object({
  userId: idSchema,
  reason: reasonField,
  deleteDays: z.coerce.number().int().min(0).max(7).optional(),
  // Temp-ban: czas w minutach (1 min – 365 dni). Brak = ban na stałe.
  minutes: z.coerce.number().int().min(1).max(525_600).optional(),
});
const userIdBody = z.object({ userId: idSchema });

/** Czytelny opis czasu temp-bana (np. „2 godz", „3 dni"). */
function durationLabel(min: number): string {
  if (min % 1440 === 0) return `${min / 1440} dni`;
  if (min % 60 === 0) return `${min / 60} godz`;
  return `${min} min`;
}

type ActionContext = {
  guildId: string;
  moderatorId: string;
  botToken: string;
  cfg: Awaited<ReturnType<typeof guildConfigRepository.get>>;
  guildName: string;
};

/**
 * Wspólne przygotowanie akcji: pobiera token bota, config i metadane serwera oraz
 * egzekwuje podstawowe guardy (brak akcji na sobie / na właścicielu). Hierarchię ról
 * weryfikuje sam Discord — odmowa wraca jako 502 z czytelnym komunikatem.
 */
async function prepareAction(
  c: Context<{ Variables: AppVariables }>,
  guildId: string,
  targetUserId: string,
): Promise<ActionContext | Response> {
  const moderatorId = c.get("userId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  if (targetUserId === moderatorId) {
    return c.json({ error: "Nie możesz wykonać tej akcji na sobie." }, 400);
  }

  const [cfg, guild] = await Promise.all([
    guildConfigRepository.get(guildId),
    fetchGuildCounts(guildId, botToken),
  ]);

  if (guild?.owner_id && guild.owner_id === targetUserId) {
    return c.json({ error: "Nie możesz moderować właściciela serwera." }, 400);
  }

  return { guildId, moderatorId, botToken, cfg, guildName: guild?.name ?? "" };
}

/** Wykonuje żądanie Discord REST i zwraca `true`, gdy zakończyło się sukcesem. */
async function discordOk(path: string, init: RequestInit): Promise<boolean> {
  const res = await discordFetch(path, init);
  return Boolean(res && res.ok);
}

function jsonBody(botToken: string, payload: unknown): RequestInit {
  return {
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  };
}

moderationRoutes.post("/:guildId/actions/warn", async (c) => {
  const body = await parseBody(c, warnBody);
  if (!body.ok) return body.res;
  const ctx = await prepareAction(c, c.req.param("guildId"), body.data.userId);
  if (ctx instanceof Response) return ctx;

  const { guildId, moderatorId, botToken, cfg, guildName } = ctx;
  const { userId } = body.data;
  const reason = body.data.reason || DEFAULT_REASON;

  await warnRepository.add({ guildId, userId, moderatorId, reason });
  const warnCount = (await warnRepository.getAll(guildId, userId)).length;

  if (cfg?.dmOnPunish) {
    await sendPunishDm({ userId, guildName, type: "warn", reason, botToken });
  }
  await logModAction({
    guildId,
    type: "warn",
    userId,
    moderatorId,
    reason,
    extra: `Ostrzeżenie #${warnCount}`,
    botToken,
    cfg,
  });

  // Auto-ban po przekroczeniu progu ostrzeżeń.
  let autoBanned = false;
  const threshold = cfg?.autoBanThreshold ?? 0;
  if (threshold > 0 && warnCount >= threshold) {
    const banReason = `Auto-ban po ${warnCount} ostrzeżeniach`;
    if (cfg?.dmOnPunish) {
      await sendPunishDm({ userId, guildName, type: "ban", reason: banReason, botToken });
    }
    autoBanned = await discordOk(`/guilds/${guildId}/bans/${userId}`, {
      method: "PUT",
      ...jsonBody(botToken, { delete_message_seconds: 0 }),
    });
    if (autoBanned) {
      await logModAction({
        guildId,
        type: "ban",
        userId,
        moderatorId,
        reason: banReason,
        extra: "Auto-ban",
        botToken,
        cfg,
      });
    }
  }

  return c.json({ warnCount, autoBanned });
});

moderationRoutes.post("/:guildId/actions/mute", async (c) => {
  const body = await parseBody(c, muteBody);
  if (!body.ok) return body.res;
  const ctx = await prepareAction(c, c.req.param("guildId"), body.data.userId);
  if (ctx instanceof Response) return ctx;

  const { guildId, moderatorId, botToken, cfg, guildName } = ctx;
  const { userId, minutes } = body.data;
  const reason = body.data.reason || DEFAULT_REASON;
  const until = new Date(Date.now() + minutes * 60_000).toISOString();

  const ok = await discordOk(`/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    ...jsonBody(botToken, { communication_disabled_until: until }),
  });
  if (!ok) {
    return c.json(
      { error: "Nie udało się wyciszyć — sprawdź uprawnienia i hierarchię ról bota." },
      502,
    );
  }

  const detail = `Czas: ${minutes} min`;
  if (cfg?.dmOnPunish) {
    await sendPunishDm({ userId, guildName, type: "mute", reason, detail, botToken });
  }
  await logModAction({
    guildId,
    type: "mute",
    userId,
    moderatorId,
    reason,
    extra: detail,
    botToken,
    cfg,
  });

  return c.json({ ok: true });
});

moderationRoutes.post("/:guildId/actions/kick", async (c) => {
  const body = await parseBody(c, kickBody);
  if (!body.ok) return body.res;
  const ctx = await prepareAction(c, c.req.param("guildId"), body.data.userId);
  if (ctx instanceof Response) return ctx;

  const { guildId, moderatorId, botToken, cfg, guildName } = ctx;
  const { userId } = body.data;
  const reason = body.data.reason || DEFAULT_REASON;

  // DM przed wyrzuceniem — po nim bot i użytkownik nie dzielą już serwera.
  if (cfg?.dmOnPunish) {
    await sendPunishDm({ userId, guildName, type: "kick", reason, botToken });
  }
  const ok = await discordOk(`/guilds/${guildId}/members/${userId}`, {
    method: "DELETE",
    headers: botHeaders(botToken, { "X-Audit-Log-Reason": encodeURIComponent(reason) }),
  });
  if (!ok) {
    return c.json(
      { error: "Nie udało się wyrzucić — sprawdź uprawnienia i hierarchię ról bota." },
      502,
    );
  }

  await logModAction({
    guildId,
    type: "kick",
    userId,
    moderatorId,
    reason,
    botToken,
    cfg,
  });
  return c.json({ ok: true });
});

moderationRoutes.post("/:guildId/actions/ban", async (c) => {
  const body = await parseBody(c, banBody);
  if (!body.ok) return body.res;
  const ctx = await prepareAction(c, c.req.param("guildId"), body.data.userId);
  if (ctx instanceof Response) return ctx;

  const { guildId, moderatorId, botToken, cfg, guildName } = ctx;
  const { userId, minutes } = body.data;
  const reason = body.data.reason || DEFAULT_REASON;
  const deleteDays = body.data.deleteDays ?? 0;

  // DM przed banem — po nim wiadomość już się nie dostarczy.
  if (cfg?.dmOnPunish) {
    await sendPunishDm({ userId, guildName, type: "ban", reason, botToken });
  }
  const ok = await discordOk(`/guilds/${guildId}/bans/${userId}`, {
    method: "PUT",
    ...jsonBody(botToken, { delete_message_seconds: deleteDays * 86_400 }),
  });
  if (!ok) {
    return c.json(
      { error: "Nie udało się zbanować — sprawdź uprawnienia i hierarchię ról bota." },
      502,
    );
  }

  // Temp-ban: zaplanuj auto-unban przez kolejkę zadań (worker bota zdejmie o czasie).
  if (minutes) {
    await botJobRepository
      .create({
        guildId,
        type: "unban",
        runAt: new Date(Date.now() + minutes * 60_000),
        recurrence: "once",
        userId,
        createdBy: moderatorId,
      })
      .catch(() => {});
  }

  const notes = [
    deleteDays > 0 ? `Usunięto wiadomości: ${deleteDays} dni` : null,
    minutes ? `Temp-ban: ${durationLabel(minutes)}` : null,
  ].filter(Boolean);

  await logModAction({
    guildId,
    type: "ban",
    userId,
    moderatorId,
    reason,
    extra: notes.length > 0 ? notes.join(" · ") : undefined,
    botToken,
    cfg,
  });
  return c.json({ ok: true });
});

moderationRoutes.post("/:guildId/actions/unmute", async (c) => {
  const body = await parseBody(c, userIdBody);
  if (!body.ok) return body.res;
  const ctx = await prepareAction(c, c.req.param("guildId"), body.data.userId);
  if (ctx instanceof Response) return ctx;

  const { guildId, moderatorId, botToken, cfg } = ctx;
  const { userId } = body.data;

  const ok = await discordOk(`/guilds/${guildId}/members/${userId}`, {
    method: "PATCH",
    ...jsonBody(botToken, { communication_disabled_until: null }),
  });
  if (!ok) return c.json({ error: "Nie udało się odciszyć użytkownika." }, 502);

  await logModAction({
    guildId,
    type: "unmute",
    userId,
    moderatorId,
    reason: "Odciszenie z panelu",
    botToken,
    cfg,
  });
  return c.json({ ok: true });
});

moderationRoutes.delete("/:guildId/bans/:userId", async (c) => {
  const userId = c.req.param("userId");
  const ctx = await prepareAction(c, c.req.param("guildId"), userId);
  if (ctx instanceof Response) return ctx;

  const { guildId, moderatorId, botToken, cfg } = ctx;

  const ok = await discordOk(`/guilds/${guildId}/bans/${userId}`, {
    method: "DELETE",
    headers: botHeaders(botToken),
  });
  if (!ok)
    return c.json(
      { error: "Nie udało się odbanować — być może nie jest zbanowany." },
      502,
    );

  // Ręczne odbanowanie unieważnia zaplanowany auto-unban (gdyby to był temp-ban).
  await botJobRepository.cancelPending(guildId, "unban", userId).catch(() => {});

  await logModAction({
    guildId,
    type: "unban",
    userId,
    moderatorId,
    reason: "Odbanowanie z panelu",
    botToken,
    cfg,
  });
  return c.json({ ok: true });
});

// ── Odczyty na potrzeby Centrum moderacji ─────────────────────────────────────

const guildMemberSchema = z.object({
  nick: z.string().nullish(),
  avatar: z.string().nullish(),
  communication_disabled_until: z.string().nullish(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullish(),
    avatar: z.string().nullish(),
  }),
});
const banListSchema = z.array(
  z.object({
    reason: z.string().nullish(),
    user: z.object({
      id: z.string(),
      username: z.string(),
      global_name: z.string().nullish(),
      avatar: z.string().nullish(),
    }),
  }),
);

type GuildMember = z.infer<typeof guildMemberSchema>;

/** Członkowie z aktywnym timeoutem (`communication_disabled_until` w przyszłości). */
async function fetchActiveMutes(
  guildId: string,
  botToken: string,
): Promise<GuildMember[] | null> {
  const members = await discordJson(
    `/guilds/${guildId}/members?limit=1000`,
    z.array(guildMemberSchema),
    { headers: botHeaders(botToken), retry: 2 },
  );
  if (!members) return null;
  const now = Date.now();
  return members.filter(
    (m) =>
      m.communication_disabled_until &&
      new Date(m.communication_disabled_until).getTime() > now,
  );
}

// Statystyki paska: aktywne ostrzeżenia, wyciszeni teraz, bany (7 dni), akcje automod (7 dni).
// Czysto-bazowe (szybkie) — bez odpytywania Discorda. „Wyciszeni teraz" panel
// liczy z `active-punishments`, by nie pobierać listy członków dwa razy.
moderationRoutes.get("/:guildId/mod-stats", async (c) => {
  const guildId = c.req.param("guildId");
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // Akcje automod logują się z botem jako moderatorem (id konta bota = client id).
  const botUserId = process.env.DISCORD_CLIENT_ID;

  const [activeWarnings, bansThisWeek, automodActions] = await Promise.all([
    warnRepository.countByGuild(guildId),
    modActionRepository.countSince(guildId, weekAgo, { type: "ban" }),
    botUserId
      ? modActionRepository.countSince(guildId, weekAgo, { moderatorId: botUserId })
      : Promise.resolve(0),
  ]);

  return c.json({ activeWarnings, bansThisWeek, automodActions });
});

// Aktywne kary: wyciszenia (timeouty z Discorda) + bany, wzbogacone o powód z audytu.
moderationRoutes.get("/:guildId/active-punishments", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const [activeMutes, bans] = await Promise.all([
    fetchActiveMutes(guildId, botToken),
    discordJson(`/guilds/${guildId}/bans?limit=1000`, banListSchema, {
      headers: botHeaders(botToken),
      retry: 2,
    }),
  ]);

  // Powody wyciszeń pobieramy jednym zapytaniem (zamiast N osobnych per użytkownik).
  const muteReasons = await modActionRepository.latestByUsers(
    guildId,
    "mute",
    (activeMutes ?? []).map((m) => m.user.id),
  );

  const mutes = (activeMutes ?? []).map((m) => ({
    userId: m.user.id,
    displayName: m.nick ?? m.user.global_name ?? m.user.username,
    username: m.user.username,
    avatar: avatarUrl(m.user.id, m.avatar ?? m.user.avatar),
    until: m.communication_disabled_until,
    reason: muteReasons.get(m.user.id)?.reason ?? null,
  }));

  // Temp-bany: zaplanowane unbany dają datę wygaśnięcia (mapowanie userId → runAt).
  const pendingUnbans = await botJobRepository.getPendingByType(guildId, "unban");
  const expiry = new Map(
    pendingUnbans
      .filter((j) => j.userId)
      .map((j) => [j.userId as string, j.runAt.toISOString()]),
  );

  const banned = (bans ?? []).map((b) => ({
    userId: b.user.id,
    displayName: b.user.global_name ?? b.user.username,
    username: b.user.username,
    avatar: avatarUrl(b.user.id, b.user.avatar),
    reason: b.reason ?? null,
    /** ISO wygaśnięcia (temp-ban) lub null (ban na stałe). */
    until: expiry.get(b.user.id) ?? null,
  }));

  return c.json({ mutes, bans: banned });
});

// Historia akcji konkretnego użytkownika (do „Karty członka"), wzbogacona o moderatora.
moderationRoutes.get("/:guildId/mod-actions/:userId", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.req.param("userId");
  const actions = await modActionRepository.getByUser(guildId, userId);

  const resolve = createMemberResolver(guildId, process.env.DISCORD_TOKEN);
  const moderatorIds = [...new Set(actions.map((a) => a.moderatorId))];
  await Promise.all(moderatorIds.map((id) => resolve(id)));

  const enriched = await Promise.all(
    actions.map(async (a) => {
      const mod = await resolve(a.moderatorId);
      return { ...a, moderatorName: mod.displayName };
    }),
  );

  return c.json(enriched);
});

// Wyszukiwarka członka po ID / nazwie / pseudonimie (do „Karty członka").
moderationRoutes.get("/:guildId/members/search", async (c) => {
  const guildId = c.req.param("guildId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const q = (c.req.query("q") ?? "").trim();
  if (!q) return c.json([]);

  // Samo ID → bezpośredni lookup (działa też dla osób spoza serwera).
  if (/^\d{5,}$/.test(q)) {
    const resolve = createMemberResolver(guildId, botToken);
    const m = await resolve(q);
    if (m.username) {
      return c.json([
        { userId: q, displayName: m.displayName, username: m.username, avatar: m.avatar },
      ]);
    }
  }

  const members = await discordJson(
    `/guilds/${guildId}/members/search?query=${encodeURIComponent(q)}&limit=10`,
    z.array(guildMemberSchema),
    { headers: botHeaders(botToken), retry: 2 },
  );

  const results = (members ?? []).map((m) => ({
    userId: m.user.id,
    displayName: m.nick ?? m.user.global_name ?? m.user.username,
    username: m.user.username,
    avatar: avatarUrl(m.user.id, m.user.avatar),
  }));
  return c.json(results);
});

const profileMemberSchema = z.object({
  nick: z.string().nullish(),
  avatar: z.string().nullish(),
  joined_at: z.string().nullish(),
  premium_since: z.string().nullish(),
  communication_disabled_until: z.string().nullish(),
  roles: z.array(z.string()),
  user: z.object({
    id: z.string(),
    username: z.string(),
    global_name: z.string().nullish(),
    avatar: z.string().nullish(),
  }),
});
const profileRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.number(),
  position: z.number(),
});

/** Data utworzenia konta z snowflake Discorda (timestamp w górnych bitach ID). */
function accountCreatedFromId(userId: string): string | null {
  if (!/^\d+$/.test(userId)) return null;
  return new Date(Number((BigInt(userId) >> 22n) + 1_420_070_400_000n)).toISOString();
}

// Pełny profil członka (Karta członka): dane live z Discorda + statystyki z bazy.
moderationRoutes.get("/:guildId/members/:userId/profile", async (c) => {
  const guildId = c.req.param("guildId");
  const userId = c.req.param("userId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;
  const headers = botHeaders(botToken);

  const [member, guildRoles, xp, warnings, ticketCount] = await Promise.all([
    discordJson(`/guilds/${guildId}/members/${userId}`, profileMemberSchema, {
      headers,
      retry: 2,
    }),
    discordJson(`/guilds/${guildId}/roles`, z.array(profileRoleSchema), {
      headers,
      retry: 2,
    }),
    xpRepository.getXp(guildId, userId),
    warnRepository.getAll(guildId, userId),
    ticketRepository.countByUser(guildId, userId),
  ]);

  const dbStats = {
    xp,
    level: levelFromXp(xp),
    warnCount: warnings.length,
    ticketCount,
    accountCreatedAt: accountCreatedFromId(userId),
  };

  // Opuścił serwer — pokaż, co się da (lookup użytkownika) + dane z bazy.
  if (!member) {
    const resolve = createMemberResolver(guildId, botToken);
    const m = await resolve(userId);
    return c.json({
      userId,
      onServer: false,
      displayName: m.displayName,
      username: m.username,
      avatar: m.avatar,
      joinedAt: null,
      timeoutUntil: null,
      boostingSince: null,
      roles: [] as { id: string; name: string; color: number }[],
      ...dbStats,
    });
  }

  type ProfileRole = z.infer<typeof profileRoleSchema>;
  const roleMap = new Map((guildRoles ?? []).map((r) => [r.id, r]));
  const roles = member.roles
    .map((id) => roleMap.get(id))
    .filter((r): r is ProfileRole => r != null && r.name !== "@everyone")
    .sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.color }));

  const timeout =
    member.communication_disabled_until &&
    new Date(member.communication_disabled_until).getTime() > Date.now()
      ? member.communication_disabled_until
      : null;

  return c.json({
    userId,
    onServer: true,
    displayName: member.nick ?? member.user.global_name ?? member.user.username,
    username: member.user.username,
    avatar: avatarUrl(userId, member.avatar ?? member.user.avatar),
    joinedAt: member.joined_at ?? null,
    timeoutUntil: timeout,
    boostingSince: member.premium_since ?? null,
    roles,
    ...dbStats,
  });
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
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const ticket = await ticketRepository.getByThread(threadId);
  if (!ticket || ticket.guildId !== guildId) return c.json({ error: "Not found" }, 404);
  if (ticket.status === "closed") return c.json({ error: "Already closed" }, 400);

  // Lock + archiwizacja wątku (best-effort — wątek mógł zostać usunięty ręcznie)
  await fetch(`${DISCORD_API}/channels/${threadId}`, {
    method: "PATCH",
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
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
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

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
    headers: botHeaders(botToken),
  }).catch(() => {});

  await ticketRepository.delete(threadId);
  return c.json({ ok: true });
});

moderationRoutes.post("/:guildId/tickets/:threadId/reopen", async (c) => {
  const guildId = c.req.param("guildId");
  const threadId = c.req.param("threadId");
  const botToken = requireBotToken(c);
  if (botToken instanceof Response) return botToken;

  const ticket = await ticketRepository.getByThread(threadId);
  if (!ticket || ticket.guildId !== guildId) return c.json({ error: "Not found" }, 404);
  if (ticket.status !== "closed") return c.json({ error: "Not closed" }, 400);

  const res = await fetch(`${DISCORD_API}/channels/${threadId}`, {
    method: "PATCH",
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
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
