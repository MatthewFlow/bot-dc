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

  const avatarHash = c.get("avatar");
  const fb = await feedbackRepository.add({
    userId,
    username,
    displayName: username,
    avatar: avatarHash
      ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`
      : null,
    guildId,
    category,
    message,
    rating,
  });

  // Kształt jak w liście panelu (głosy jako liczba; bez listy userId-ów).
  const { upvotedBy, ...rest } = fb;
  return c.json({ ...rest, upvotes: upvotedBy.length, upvotedByMe: false }, 201);
});

// Lista własnych zgłoszeń zalogowanego użytkownika.
feedbackRoutes.get("/mine", async (c) => {
  const userId = c.get("userId");
  return c.json(await feedbackRepository.getByUser(userId));
});
