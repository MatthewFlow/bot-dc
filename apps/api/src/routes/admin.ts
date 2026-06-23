import { botStatusRepository } from "@jurassic-haven/db";
import { Hono } from "hono";
import { z } from "zod";

import { avatarUrl, botHeaders, discordJson, requireBotToken } from "../lib/discord";
import { ownerGuard } from "../lib/ownerGuard";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

/** Heartbeat starszy niż tyle ms = bot offline (jak w /bot/status). */
const BOT_STALE_MS = 90_000;
/** Limit równoległych zapytań do Discorda, by nie wywołać lawiny 429. */
const CONCURRENCY = 8;

const listGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  approximate_member_count: z.number().optional(),
});
const listSchema = z.array(listGuildSchema);
const guildOwnerSchema = z.object({ owner_id: z.string().optional() });
const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullable().optional(),
  avatar: z.string().nullable(),
});
type DiscordUser = z.infer<typeof userSchema>;

/** Ikona serwera z CDN Discorda (null, gdy serwer nie ma ikony). */
function guildIcon(id: string, hash: string | null): string | null {
  return hash ? `https://cdn.discordapp.com/icons/${id}/${hash}.png` : null;
}

/** Map z ograniczoną współbieżnością — zachowuje kolejność wyników. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.use("*", authMiddleware);
adminRoutes.use("*", ownerGuard);

/**
 * Zbiorczy widok właściciela: wszystkie serwery, na których jest bot (live z
 * Discorda) + właściciel każdego z nich + sumy. Lista i liczby członków idą jednym
 * zapytaniem (`with_counts`); `owner_id` dociągany per serwer, a nazwy właścicieli
 * rozwiązywane raz na unikalne ID — wszystko z limitem współbieżności.
 */
adminRoutes.get("/overview", async (c) => {
  const token = requireBotToken(c);
  if (token instanceof Response) return token;

  const list =
    (await discordJson(`/users/@me/guilds?with_counts=true&limit=200`, listSchema, {
      headers: botHeaders(token),
      retry: 2,
    })) ?? [];

  // owner_id per serwer (best-effort, równolegle z limitem).
  const owners = await mapLimit(list, CONCURRENCY, (g) =>
    discordJson(`/guilds/${g.id}`, guildOwnerSchema, {
      headers: botHeaders(token),
      retry: 1,
    }),
  );

  // Nazwy/avatary właścicieli — tylko raz na unikalne ID.
  const ownerIds = [
    ...new Set(owners.map((o) => o?.owner_id).filter((v): v is string => !!v)),
  ];
  const users = await mapLimit(ownerIds, CONCURRENCY, (id) =>
    discordJson(`/users/${id}`, userSchema, { headers: botHeaders(token), retry: 1 }),
  );
  const userById = new Map<string, DiscordUser>(
    users.filter((u): u is DiscordUser => !!u).map((u) => [u.id, u]),
  );

  const guilds = list
    .map((g, i) => {
      const ownerId = owners[i]?.owner_id ?? null;
      const u = ownerId ? userById.get(ownerId) : undefined;
      return {
        id: g.id,
        name: g.name,
        icon: guildIcon(g.id, g.icon),
        memberCount: g.approximate_member_count ?? null,
        owner: ownerId
          ? {
              id: ownerId,
              name: u ? (u.global_name ?? u.username) : ownerId,
              avatar: u ? avatarUrl(u.id, u.avatar) : null,
            }
          : null,
      };
    })
    .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));

  const snap = await botStatusRepository.get();
  const last = snap.lastHeartbeat ? snap.lastHeartbeat.getTime() : 0;
  const botOnline = last > 0 && Date.now() - last < BOT_STALE_MS;

  return c.json({
    totals: {
      guildCount: guilds.length,
      memberCount: guilds.reduce((sum, g) => sum + (g.memberCount ?? 0), 0),
      botOnline,
    },
    guilds,
  });
});
