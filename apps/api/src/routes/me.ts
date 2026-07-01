import { userPreferencesRepository } from "@jurassic-haven/db";
import { Hono } from "hono";
import { z } from "zod";

import { authMiddleware } from "../middleware/authMiddleware";
import type { AppVariables } from "../types";

// Preferencje bieżącego użytkownika (auth-only, NIE per-guild). userId bierzemy
// z JWT (authMiddleware), więc każdy edytuje wyłącznie własne ustawienia.
export const meRoutes = new Hono<{ Variables: AppVariables }>();

meRoutes.use("*", authMiddleware);

const langSchema = z.object({ lang: z.enum(["pl", "en"]) });

// `lang: null` = user nie ustawił własnego języka → panel użyje detekcji systemu.
meRoutes.get("/preferences", async (c) => {
  const lang = await userPreferencesRepository.getLang(c.get("userId"));
  return c.json({ lang });
});

meRoutes.put("/preferences", async (c) => {
  const parsed = langSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "INVALID_LANG" }, 400);
  await userPreferencesRepository.setLang(c.get("userId"), parsed.data.lang);
  return c.json({ ok: true });
});
