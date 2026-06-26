import { API_URL, fetchWithRetry } from "./core";
import type { StickyMessage, StickyUpsertInput } from "./types";

async function errMessage(res: Response, def: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || def;
}

export async function getStickies(guildId: string): Promise<StickyMessage[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/sticky`);
  if (!res.ok) throw new Error("Failed to fetch sticky messages");
  return res.json();
}

export async function upsertSticky(
  guildId: string,
  channelId: string,
  input: StickyUpsertInput,
): Promise<StickyMessage> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/sticky/${channelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await errMessage(res, "Nie udało się zapisać sticky."));
  return res.json();
}

export async function deleteSticky(guildId: string, channelId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/sticky/${channelId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await errMessage(res, "Nie udało się usunąć sticky."));
}
