import type { z } from "zod";

import { adminOverviewSchema } from "../schemas";
import { API_URL, fetchWithRetry } from "./core";

/** Zbiorczy widok właściciela: wszystkie serwery bota + sumy. */
export type AdminOverview = z.infer<typeof adminOverviewSchema>;

/**
 * Pobiera owner-overview. API zwraca 403 dla nie-właścicieli — wtedy `fetchWithRetry`
 * nie przekierowuje (to robi tylko 401), a my rzucamy błędem, który strona pokazuje
 * jako „brak dostępu".
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await fetchWithRetry(`${API_URL}/admin/overview`);
  if (res.status === 403) throw new Error("Forbidden");
  if (!res.ok) throw new Error("Failed to fetch admin overview");
  return adminOverviewSchema.parse(await res.json());
}
