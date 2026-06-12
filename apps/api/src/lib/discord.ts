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
