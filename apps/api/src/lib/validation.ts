import type { Context } from "hono";
import { z } from "zod";

/**
 * safeParse the JSON request body against a zod schema. Returns either the typed
 * data or a ready 400 response — so routes drop the unsafe `as { … }` casts and
 * get runtime validation from a single source of truth.
 */
export async function parseBody<T>(
  c: Context,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; res: Response }> {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid request body";
    return { ok: false, res: c.json({ error: msg }, 400) };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Reads `?limit=` from the query, clamping to `[1, max]` and falling back to
 * `def` for missing/non-positive/non-finite values. Single source for the
 * list endpoints that all repeated this guard inline.
 */
export function parseLimit(c: Context, def: number, max: number): number {
  const raw = Number(c.req.query("limit") ?? def);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, max) : def;
}

/** Discord snowflake id as accepted across the config (non-empty, ≤32 chars). */
export const idSchema = z.string().trim().min(1).max(32);

/** `{ name }` body for creating a channel or role. */
export const nameSchema = z.object({
  name: z.string().trim().min(1, "Invalid name").max(100, "Invalid name"),
});

/** `{ channelId }` body for sending a panel to a channel. */
export const channelIdSchema = z.object({
  channelId: z.string().trim().min(1, "Missing channelId"),
});

/** Feedback submission — author comes from the JWT, not the body. */
export const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Message required").max(2000, "Message too long"),
  category: z.enum(["bug", "suggestion", "other"]).catch("other"),
  rating: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  guildId: idSchema.optional(),
});

/** Tworzenie giveawaya: nagroda, kanał, liczba zwycięzców, czas zakończenia (ISO). */
export const giveawayCreateSchema = z.object({
  channelId: idSchema,
  prize: z.string().trim().min(1, "Podaj nagrodę").max(256, "Nagroda jest za długa"),
  winnerCount: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1 zwycięzca")
    .max(50, "Maksimum 50 zwycięzców"),
  endsAt: z.coerce
    .date()
    .refine(
      (d) => d.getTime() > Date.now() + 30_000,
      "Czas zakończenia musi być w przyszłości",
    )
    .refine(
      (d) => d.getTime() < Date.now() + 60 * 24 * 60 * 60 * 1000,
      "Maksymalny czas trwania to 60 dni",
    ),
});

/** Sticky message: tryb tekst/embed + treść (walidacja niepustości w trasie). */
export const stickyUpsertSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["text", "embed"]),
  content: z.string().trim().max(2000, "Treść jest za długa").optional(),
  // Pełny EmbedConfig — walidowany dalej przez toDiscordEmbed/isEmbedEmpty.
  embed: z.record(z.string(), z.unknown()).optional(),
});

/** Button-roles panel: embed + up to 25 buttons, one per role. */
export const buttonRolesSchema = z.object({
  channelId: z.string().trim().min(1, "Missing required fields"),
  // Full EmbedConfig — its contents are validated downstream by toDiscordEmbed/isEmbedEmpty.
  embed: z.record(z.string(), z.unknown()),
  entries: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Each button needs a label").max(80),
        emoji: z
          .string()
          .trim()
          .min(1)
          .optional()
          .transform((v) => v || undefined),
        roleId: idSchema,
      }),
    )
    .min(1, "Missing required fields")
    .max(25, "Too many buttons (max 25)")
    .refine((e) => new Set(e.map((x) => x.roleId)).size === e.length, {
      message: "Each role can only have one button",
    }),
});
