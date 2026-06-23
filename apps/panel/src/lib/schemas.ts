import { z } from "zod";

/**
 * Schematy zod dla danych przekraczających granicę klient↔API.
 *
 * - inputy (feedback): walidacja PRZED wysyłką — natychmiastowy komunikat dla
 *   użytkownika i ten sam kontrakt, który API egzekwuje po stronie serwera.
 * - odpowiedzi: `parse` małych, stabilnych payloadów wyłapuje rozjazd kształtu
 *   wcześnie (zamiast cichego `undefined` w UI). Nieznane pola są pomijane.
 */

export const feedbackCategorySchema = z.enum(["bug", "suggestion", "other"]);

export const feedbackInputSchema = z.object({
  category: feedbackCategorySchema,
  message: z
    .string()
    .trim()
    .min(1, "Wpisz treść zgłoszenia.")
    .max(2000, "Maksymalnie 2000 znaków."),
  rating: z.number().int().min(1).max(5).optional(),
  guildId: z.string().optional(),
});

export const userSchema = z.object({
  userId: z.string(),
  username: z.string(),
  displayName: z.string().nullish(),
  avatar: z.string().nullable(),
});

export const botStatusSchema = z.object({
  online: z.boolean(),
  username: z.string().nullable(),
  avatar: z.string().nullable(),
  guildCount: z.number(),
  // Domyślnie null — starszy heartbeat (sprzed wdrożenia) może ich nie mieć.
  version: z.string().nullable().default(null),
  ping: z.number().nullable().default(null),
  startedAt: z.string().nullable().default(null),
  lastSeen: z.string().nullable(),
});

/** Owner panel: zbiorczy widok serwerów bota (tylko dla właścicieli z env). */
export const adminOverviewSchema = z.object({
  totals: z.object({
    guildCount: z.number(),
    memberCount: z.number(),
    botOnline: z.boolean(),
  }),
  guilds: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      icon: z.string().nullable(),
      memberCount: z.number().nullable(),
      owner: z
        .object({
          id: z.string(),
          name: z.string(),
          avatar: z.string().nullable(),
        })
        .nullable(),
    }),
  ),
});
