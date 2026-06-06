import { connectDb } from "@jurassic-haven/db";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { rateLimit } from "./middleware/rateLimit";
import { authRoutes } from "./routes/authRoutes";
import { feedbackRoutes } from "./routes/feedback";
import { guildRoutes } from "./routes/guilds";
import { moderationRoutes } from "./routes/moderation";
import { reactionRoleRoutes } from "./routes/reactionRoles";
import type { AppVariables } from "./types";

const app = new Hono<{ Variables: AppVariables }>();

// Allowed browser origins — comma-separated list in CORS_ORIGINS (falls back to
// PANEL_URL, then localhost for dev). With credentials enabled we must echo a
// specific origin, never "*".
const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  process.env.PANEL_URL ??
  "http://localhost:3000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

// Blanket abuse protection (per IP). Auth endpoints get a stricter limit.
app.use("*", rateLimit({ windowMs: 10_000, max: 120 }));
app.use("/auth/*", rateLimit({ windowMs: 60_000, max: 20 }));
// Antyspam na wysyłkę feedbacku (per IP).
app.use("/feedback", rateLimit({ windowMs: 60_000, max: 10 }));

app.route("/auth", authRoutes);
app.route("/guilds", guildRoutes);
app.route("/guilds", reactionRoleRoutes);
app.route("/guilds", moderationRoutes);
app.route("/feedback", feedbackRoutes);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.API_PORT ?? 3002);

// Fail-fast w produkcji: brak sekretu = brak startu (zamiast cichego 500 przy logowaniu).
if (process.env.NODE_ENV === "production") {
  const required = [
    "JWT_SECRET",
    "MONGODB_URI",
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "DISCORD_TOKEN",
    "PANEL_URL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `[api] Brak wymaganych zmiennych środowiskowych: ${missing.join(", ")}`,
    );
    process.exit(1);
  }
  if ((process.env.JWT_SECRET ?? "").length < 32) {
    console.error("[api] JWT_SECRET jest za krótki — użyj min. 32 losowych znaków.");
    process.exit(1);
  }
}

await connectDb();

Bun.serve({ port, fetch: app.fetch });

console.log(`API działa na http://localhost:${port}`);
