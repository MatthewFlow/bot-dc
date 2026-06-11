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
