import type { Context, Next } from "hono";
import { jwtVerify } from "jose";

import type { AppVariables } from "../types";

export async function authMiddleware(
  c: Context<{ Variables: AppVariables }>,
  next: Next,
) {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Brak JWT_SECRET w .env");

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));

    c.set("userId", payload.userId as string);
    c.set("username", payload.username as string);
    c.set("avatar", payload.avatar as string | null);
    c.set("accessToken", payload.accessToken as string);

    await next();
  } catch (e) {
    console.error("[auth] JWT error:", e);
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}
