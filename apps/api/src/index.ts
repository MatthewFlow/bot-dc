import { connectDb } from "@jurassic-haven/db";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { authRoutes } from "./routes/authRoutes";
import { guildRoutes } from "./routes/guilds";
import type { AppVariables } from "./types";

const app = new Hono<{ Variables: AppVariables }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000"],
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.route("/auth", authRoutes);
app.route("/guilds", guildRoutes);

app.get("/health", (c) => c.json({ ok: true }));

const port = Number(process.env.API_PORT ?? 3002);

await connectDb();

Bun.serve({ port, fetch: app.fetch });

console.log(`API działa na http://localhost:${port}`);
