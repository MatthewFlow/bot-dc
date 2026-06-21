import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import { verifyToken } from "../lib/auth";
import type { AppVariables } from "../types";

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

  const auth = await verifyToken(token);
  if (!auth) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", auth.userId);
  c.set("username", auth.username);
  c.set("avatar", auth.avatar);
  c.set("accessToken", auth.accessToken);

  await next();
}
