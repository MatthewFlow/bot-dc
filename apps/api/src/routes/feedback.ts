import { feedbackRepository } from "@jurassic-haven/db";
import { Hono } from "hono";

import { feedbackSchema, parseBody } from "../lib/validation";
import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

export const feedbackRoutes = new Hono<{ Variables: AppVariables }>();

feedbackRoutes.use("*", authMiddleware);

// Wysłanie zgłoszenia. Autor (userId/username) brany z JWT — nie z body.
feedbackRoutes.post("/", async (c) => {
  const userId = c.get("userId");
  const username = c.get("username");

  const parsed = await parseBody(c, feedbackSchema);
  if (!parsed.ok) return parsed.res;
  const { message, category, rating, guildId } = parsed.data;

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
