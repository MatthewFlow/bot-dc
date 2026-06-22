import { botStatusSchema } from "../schemas";
import { API_URL, fetchWithRetry } from "./core";
import type { BotStatus } from "./types";

/** Status bota (online/offline) na podstawie heartbeatu w bazie. */
export async function getBotStatus(): Promise<BotStatus> {
  const res = await fetchWithRetry(`${API_URL}/bot/status`);
  if (!res.ok) throw new Error("Failed to fetch bot status");
  return botStatusSchema.parse(await res.json());
}
