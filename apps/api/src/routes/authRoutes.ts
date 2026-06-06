import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { jwtVerify, SignJWT } from "jose";

import { sessions } from "../lib/sessions";

const DISCORD_API = "https://discord.com/api/v10";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Ciasteczka Secure działają tylko po HTTPS. Domyślnie wł. w produkcji (wdrożenie z domeną/TLS),
// ale przy wdrożeniu na samym IP po HTTP trzeba ustawić COOKIE_SECURE=false, inaczej przeglądarka
// odrzuci ciasteczko logowania i nie da się zalogować.
const COOKIE_SECURE =
  process.env.COOKIE_SECURE != null
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

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
    secure: COOKIE_SECURE,
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

// Bot invite link — redirects to Discord's authorize page with the scopes and
// permissions the bot needs. Used by the panel's "Add server" button.
authRoutes.get("/invite", (c) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return c.json({ error: "Missing OAuth2 config" }, 500);

  // Permission bit indices the bot requires (View Channels, Send/Manage Messages,
  // Read History, Add Reactions, Manage Roles/Channels, Kick/Ban, Timeout, Threads).
  const permissions = [10, 11, 13, 16, 6, 28, 4, 1, 2, 40, 34, 36, 38]
    .reduce((acc, bit) => acc | (1n << BigInt(bit)), 0n)
    .toString();

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions,
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
  await sessions.set(user.id, tokenData.access_token, SESSION_TTL_MS);

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
    secure: COOKIE_SECURE,
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

    if (!(await sessions.get(userId))) {
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

authRoutes.post("/logout", async (c) => {
  // Best-effort: also drop the server-side session so the access token is revoked.
  const header = c.req.header("authorization") ?? "";
  const token =
    (header.startsWith("Bearer ") ? header.slice(7) : null) ?? getCookie(c, "jh_token");
  const jwtSecret = process.env.JWT_SECRET;
  if (token && jwtSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
      await sessions.delete(payload.userId as string);
    } catch {
      // ignore — invalid token, nothing to revoke
    }
  }

  deleteCookie(c, "jh_token", { path: "/" });
  return c.json({ ok: true });
});
