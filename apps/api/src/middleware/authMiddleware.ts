import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { jwtVerify } from "jose";

import { sessions } from "../lib/sessions";
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

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Brak JWT_SECRET w .env");

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    const userId = payload.userId as string;

    const accessToken = sessions.get(userId);
    if (!accessToken) {
      return c.json({ error: "Session expired, please log in again" }, 401);
    }

    c.set("userId", userId);
    c.set("username", payload.username as string);
    c.set("avatar", payload.avatar as string | null);
    c.set("accessToken", accessToken);

    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
