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
 * Lightweight in-memory fixed-window rate limiter. Per-instance only — for a
 * horizontally-scaled deployment back it with a shared store (e.g. Redis).
 */
export function rateLimit({ windowMs, max, key }: RateLimitOptions) {
  const store = new Map<string, Bucket>();

  function resolveKey(c: Context): string {
    if (key) return key(c);
    try {
      return getConnInfo(c).remote.address ?? "unknown";
    } catch {
      return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    }
  }

  return async (c: Context, next: Next) => {
    const now = Date.now();

    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (store.size > 5000 && Math.random() < 0.02) {
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    }

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
