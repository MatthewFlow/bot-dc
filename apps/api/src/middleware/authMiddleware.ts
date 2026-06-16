import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { jwtVerify } from "jose";
import { z } from "zod";

import { sessions } from "../lib/sessions";
import type { AppVariables } from "../types";

// Kształt naszego payloadu JWT — walidujemy go zamiast surowych rzutowań `as`,
// żeby token bez `userId`/`username` nie przeszedł dalej z `undefined`.
const jwtPayloadSchema = z.object({
  userId: z.string().min(1),
  username: z.string(),
  avatar: z.string().nullish(),
});

export async function authMiddleware(
  c: Context<{ Variables: AppVariables }>,
  next: Next,
) {
  // Accept token from Authorization header (API clients / curl) or HttpOnly cookie (browser)
  const header = c.req.header("authorization") ?? "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = getCookie(c, "jh_token") ?? null;
  const token = headerToken ?? cookieToken;

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Brak JWT_SECRET w .env");

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const claims = jwtPayloadSchema.parse(payload);

    const accessToken = await sessions.get(claims.userId);
    if (!accessToken) {
      return c.json({ error: "Session expired, please log in again" }, 401);
    }

    c.set("userId", claims.userId);
    c.set("username", claims.username);
    c.set("avatar", claims.avatar ?? null);
    c.set("accessToken", accessToken);

    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
