import type { FeedbackCategory } from "@jurassic-haven/db";
import { feedbackRepository } from "@jurassic-haven/db";
import { Hono } from "hono";

import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

const CATEGORIES = new Set<FeedbackCategory>(["bug", "suggestion", "other"]);

export const feedbackRoutes = new Hono<{ Variables: AppVariables }>();

feedbackRoutes.use("*", authMiddleware);

// Wysłanie zgłoszenia. Autor (userId/username) brany z JWT — nie z body.
feedbackRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const username = c.get("username");

  const raw = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") {
    return c.json({ error: "Invalid body" }, 400);
  }

  const message = typeof raw.message === "string" ? raw.message.trim() : "";
  if (!message) return c.json({ error: "Message required" }, 400);
  if (message.length > 2000) return c.json({ error: "Message too long" }, 400);

  const category: FeedbackCategory = CATEGORIES.has(raw.category as FeedbackCategory)
    ? (raw.category as FeedbackCategory)
    : "other";

  const ratingNum = Number(raw.rating);
  const rating =
    Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5
      ? ratingNum
      : undefined;

  const guildId =
    typeof raw.guildId === "string" && raw.guildId.length <= 32 ? raw.guildId : undefined;

  const fb = await feedbackRepository.add({
    userId,
    username,
    guildId,
    category,
    message,
    rating,
  });

  return c.json(fb, 201);
});

// Lista własnych zgłoszeń zalogowanego użytkownika.
feedbackRoutes.get("/mine", async (c) => {
  const userId = c.get("userId");
  return c.json(await feedbackRepository.getByUser(userId));
});
