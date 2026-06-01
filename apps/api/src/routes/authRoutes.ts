import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { jwtVerify, SignJWT } from "jose";

import { sessions } from "../lib/sessions";

const DISCORD_API = "https://discord.com/api/v10";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const authRoutes = new Hono();

authRoutes.get("/discord", (c) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return c.json({ error: "Missing OAuth2 config" }, 500);
  }

  const state = crypto.randomUUID();

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    path: "/",
    maxAge: 300,
    sameSite: "Lax",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state,
  });

  return c.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

authRoutes.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) return c.json({ error: "Missing code" }, 400);

  const storedState = getCookie(c, "oauth_state");
  if (!state || !storedState || state !== storedState) {
    return c.json({ error: "Invalid state" }, 400);
  }
  deleteCookie(c, "oauth_state", { path: "/" });

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const jwtSecret = process.env.JWT_SECRET;

  if (!clientId || !clientSecret || !redirectUri || !jwtSecret) {
    return c.json({ error: "Missing config" }, 500);
  }

  const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[auth] Token exchange failed:", err);
    return c.json({ error: "Failed to exchange code" }, 400);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };

  const userRes = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return c.json({ error: "Failed to fetch user" }, 400);
  }

  const user = (await userRes.json()) as {
    id: string;
    username: string;
    avatar: string | null;
  };

  // Store Discord access_token server-side — never expose it in the JWT
  sessions.set(user.id, tokenData.access_token, SESSION_TTL_MS);

  const jwt = await new SignJWT({
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(jwtSecret));

  setCookie(c, "jh_token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    sameSite: "Lax",
  });

  const panelUrl = process.env.PANEL_URL ?? "http://localhost:3000";
  return c.redirect(`${panelUrl}/auth/success`);
});

authRoutes.get("/me", async (c) => {
  const header = c.req.header("authorization") ?? "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const cookieToken = getCookie(c, "jh_token") ?? null;
  const token = headerToken ?? cookieToken;

  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return c.json({ error: "Missing config" }, 500);

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    const userId = payload.userId as string;

    if (!sessions.get(userId)) {
      return c.json({ error: "Session expired" }, 401);
    }

    return c.json({
      userId,
      username: payload.username,
      avatar: payload.avatar,
    });
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

authRoutes.post("/logout", (c) => {
  deleteCookie(c, "jh_token", { path: "/" });
  return c.json({ ok: true });
});
