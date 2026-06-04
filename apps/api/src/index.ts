import { connectDb } from "@jurassic-haven/db";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { rateLimit } from "./middleware/rateLimit";
import { authRoutes } from "./routes/authRoutes";
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

app.route("/auth", authRoutes);
app.route("/guilds", guildRoutes);
app.route("/guilds", reactionRoleRoutes);
app.route("/guilds", moderationRoutes);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.API_PORT ?? 3002);

await connectDb();

Bun.serve({ port, fetch: app.fetch });

console.log(`API działa na http://localhost:${port}`);
