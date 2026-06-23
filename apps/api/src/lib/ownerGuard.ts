import { createMiddleware } from "hono/factory";

import type { AppVariables } from "../types";

/**
 * Discord user IDs dopuszczone do „owner panelu" (zbiorczy widok wszystkich
 * serwerów bota). Lista w env `OWNER_DISCORD_IDS` (po przecinku) — pozwala dodać
 * kolejne osoby bez zmiany kodu. Pusta lista = panel zamknięty dla wszystkich.
 */
const OWNER_IDS = new Set(
  (process.env.OWNER_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

/** Czy zalogowany użytkownik jest skonfigurowanym właścicielem bota. */
export function isOwner(userId: string): boolean {
  return OWNER_IDS.has(userId);
}

/**
 * Middleware: 403, jeśli zalogowany użytkownik nie jest na liście właścicieli.
 * Zakłada, że `authMiddleware` ustawił już `userId`. To jedyna prawdziwa bramka
 * owner-panelu — panel tylko ją odpytuje, więc znajomość URL nic nie daje.
 */
export const ownerGuard = createMiddleware<{ Variables: AppVariables }>(
  async (c, next) => {
    if (!isOwner(c.get("userId"))) return c.json({ error: "Forbidden" }, 403);
    await next();
  },
);
