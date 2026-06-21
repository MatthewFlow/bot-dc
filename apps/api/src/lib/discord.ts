import type { Context } from "hono";
import { z, type ZodType } from "zod";

/** Discord REST base — single source for the whole API. */
export const DISCORD_API = "https://discord.com/api/v10";

/** Shape of a freshly created message — we only ever need its id. */
export const messageIdSchema = z.object({ id: z.string() });

/** Authorization header for a bot-token request (optionally merged with extras). */
export function botHeaders(
  token: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return { Authorization: `Bot ${token}`, ...extra };
}

/** Discord CDN avatar URL from a user id + avatar hash (`null` when no hash). */
export function avatarUrl(
  userId: string,
  hash: string | null | undefined,
): string | null {
  return hash ? `https://cdn.discordapp.com/avatars/${userId}/${hash}.png` : null;
}

type DiscordFetchInit = RequestInit & {
  /** How many times to retry on HTTP 429, honouring `retry_after`. Default 0. */
  retry?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `fetch` against the Discord API with built-in 429 handling. A bare path
 * (`/guilds/…`) is resolved against {@link DISCORD_API}; a full URL is used as-is.
 * Returns the `Response` (including non-2xx) or `null` on a network error.
 */
export async function discordFetch(
  path: string,
  init: DiscordFetchInit = {},
): Promise<Response | null> {
  const { retry = 0, ...rest } = init;
  const url = path.startsWith("http") ? path : `${DISCORD_API}${path}`;

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, rest);
    } catch {
      return null;
    }
    if (res.status === 429 && attempt < retry) {
      const body = (await res.json().catch(() => null)) as {
        retry_after?: number;
      } | null;
      // retry_after is in seconds; clamp against odd values.
      await sleep(Math.min(Math.max((body?.retry_after ?? 1) * 1000, 200), 5000));
      continue;
    }
    return res;
  }
}

/**
 * GET-and-validate: fetches `path`, then parses the JSON body against `schema`.
 * Returns the typed value, or `null` on any failure (network, non-2xx, or a body
 * that doesn't match the schema) — so callers never trust an unvalidated shape.
 */
export async function discordJson<T>(
  path: string,
  schema: ZodType<T>,
  init: DiscordFetchInit = {},
): Promise<T | null> {
  const res = await discordFetch(path, init);
  if (!res || !res.ok) return null;
  const parsed = schema.safeParse(await res.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

/**
 * Proxies a Discord REST call on behalf of a route. Forwards a 429 to the client
 * (with `retry_after`), maps every other failure (network / non-2xx / a body that
 * doesn't match `schema`) to a logged 502, and otherwise returns the validated
 * body. Routes consume it in two lines:
 *
 *   const data = await discordProxy(c, path, schema, init, "fetch channels");
 *   if (data instanceof Response) return data;
 *
 * `label` doubles as the log tag and the client error ("Failed to <label>").
 */
export async function discordProxy<T>(
  c: Context,
  path: string,
  schema: ZodType<T>,
  init: DiscordFetchInit,
  label: string,
): Promise<T | Response> {
  const res = await discordFetch(path, init);

  if (res?.status === 429) {
    const body = (await res.json().catch(() => null)) as { retry_after?: number } | null;
    return c.json(
      { error: "Rate limited by Discord", retry_after: body?.retry_after ?? 1 },
      429,
    );
  }

  if (!res || !res.ok) {
    const detail = res
      ? `${res.status}: ${await res.text().catch(() => "")}`
      : "network error";
    console.error(`[discord] ${label} → ${detail}`);
    return c.json({ error: `Failed to ${label}` }, 502);
  }

  const parsed = schema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    console.error(`[discord] ${label}: invalid response shape`);
    return c.json({ error: `Failed to ${label}` }, 502);
  }
  return parsed.data;
}

/**
 * Posts a message to a channel as the bot and returns its id (the only field
 * callers need), or `null` on any failure. Shared by the reaction/button-role
 * publish paths, which map `null` to their own 502.
 */
export async function sendDiscordMessage(
  channelId: string,
  token: string,
  payload: unknown,
  logTag: string,
): Promise<{ id: string } | null> {
  const res = await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    headers: botHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res || !res.ok) {
    console.error(
      `[${logTag}] Błąd wysyłania wiadomości:`,
      res ? await res.text().catch(() => "") : "network error",
    );
    return null;
  }
  const msg = messageIdSchema.safeParse(await res.json().catch(() => null));
  return msg.success ? msg.data : null;
}

/**
 * Locks/archives (or reopens) a thread as the bot. Returns the `Response`
 * (so callers needing to fail on error can check `res?.ok`) or `null` on a
 * network error. Used by the ticket close/reopen paths.
 */
export function setThreadState(
  threadId: string,
  token: string,
  state: { archived: boolean; locked: boolean },
): Promise<Response | null> {
  return discordFetch(`/channels/${threadId}`, {
    method: "PATCH",
    headers: botHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(state),
  });
}

/**
 * Returns the configured bot token, or a ready 500 JSON `Response` when it's
 * missing — so routes guard with one line: `if (t instanceof Response) return t`.
 */
export function requireBotToken(c: Context): string | Response {
  const token = process.env.DISCORD_TOKEN;
  if (!token) return c.json({ error: "Missing bot token" }, 500);
  return token;
}

const guildCountsSchema = z.object({
  name: z.string().optional(),
  owner_id: z.string().optional(),
  approximate_member_count: z.number().optional(),
  approximate_presence_count: z.number().optional(),
});
export type GuildCounts = z.infer<typeof guildCountsSchema>;

/** Live member/presence counts for a guild (best-effort — `null` on failure). */
export function fetchGuildCounts(
  guildId: string,
  token: string,
): Promise<GuildCounts | null> {
  return discordJson(`/guilds/${guildId}?with_counts=true`, guildCountsSchema, {
    headers: botHeaders(token),
  });
}

/**
 * Builds a `{server}` / `{member_count}` substitution fn from live guild counts.
 * Best-effort: on any failure the variables resolve to empty strings.
 */
export async function serverVarReplacer(
  guildId: string,
  token: string,
): Promise<(s: string) => string> {
  const g = await fetchGuildCounts(guildId, token);
  const serverName = g?.name ?? "";
  const memberCount =
    g?.approximate_member_count != null ? String(g.approximate_member_count) : "";
  return (s) =>
    s.replace(/{server}/g, serverName).replace(/{member_count}/g, memberCount);
}
