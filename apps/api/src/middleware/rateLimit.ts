import type { Context, Next } from "hono";
import { getConnInfo } from "hono/bun";

type Bucket = { count: number; resetAt: number };

type RateLimitOptions = {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed per key per window. */
  max: number;
  /** Key function — defaults to the client IP. */
  key?: (c: Context) => string;
};

/**
 * When the API runs behind a reverse proxy (nginx on the VPS), the socket peer
 * is the proxy — so every client shares one bucket unless we read the real IP
 * from X-Forwarded-For. Only trust that header when TRUST_PROXY=true, otherwise
 * a direct client could spoof it to evade the limit.
 */
const TRUST_PROXY = process.env.TRUST_PROXY === "true";

/**
 * Lightweight in-memory fixed-window rate limiter. Per-instance only — for a
 * horizontally-scaled deployment back it with a shared store (e.g. Redis).
 */
export function rateLimit({ windowMs, max, key }: RateLimitOptions) {
  const store = new Map<string, Bucket>();

  // Okresowe czyszczenie wygasłych kubełków — unref, by nie blokować zamknięcia
  // procesu. Spójne z pozostałymi sweeperami (automod, guildGuard, voiceXp).
  const sweep = setInterval(
    () => {
      const now = Date.now();
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    },
    Math.max(windowMs, 30_000),
  );
  sweep.unref?.();

  function resolveKey(c: Context): string {
    if (key) return key(c);
    if (TRUST_PROXY) {
      const xff = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
      if (xff) return xff;
    }
    try {
      return getConnInfo(c).remote.address ?? "unknown";
    } catch {
      // Awaryjnie: ufamy XFF tylko za zaufanym proxy. Bez TRUST_PROXY zwracamy
      // stałą (wspólny, ostrzejszy kubełek) — inaczej XFF dałby spoofowalny
      // bypass limitu per-IP. Fail-closed.
      if (TRUST_PROXY) {
        const xff = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
        if (xff) return xff;
      }
      return "unknown";
    }
  }

  return async (c: Context, next: Next) => {
    const now = Date.now();

    const id = resolveKey(c);
    let bucket = store.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      store.set(id, bucket);
    }

    bucket.count++;
    if (bucket.count > max) {
      c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  };
}
