import { Hono } from "hono";
import { jwtVerify, SignJWT } from "jose";

const DISCORD_API = "https://discord.com/api/v10";

export const authRoutes = new Hono();

authRoutes.get("/discord", (c) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return c.json({ error: "Missing OAuth2 config" }, 500);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
  });

  return c.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

authRoutes.get("/callback", async (c) => {
  const code = c.req.query("code");
  if (!code) return c.json({ error: "Missing code" }, 400);

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

  const jwt = await new SignJWT({
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    accessToken: tokenData.access_token,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(jwtSecret));

  return c.redirect(`http://localhost:3000/auth/success?token=${jwt}`);
});

authRoutes.get("/me", async (c) => {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return c.json({ error: "Missing config" }, 500);

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return c.json({
      userId: payload.userId,
      username: payload.username,
      avatar: payload.avatar,
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
