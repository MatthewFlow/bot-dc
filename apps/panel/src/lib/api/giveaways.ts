import { API_URL, fetchWithRetry } from "./core";
import type { CreateGiveawayInput, Giveaway } from "./types";

/** Wyciąga komunikat błędu z odpowiedzi API (fallback do `def`). */
async function errMessage(res: Response, def: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || def;
}

export async function getGiveaways(guildId: string): Promise<Giveaway[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/giveaways`);
  if (!res.ok) throw new Error("Failed to fetch giveaways");
  return res.json();
}

export async function createGiveaway(
  guildId: string,
  input: CreateGiveawayInput,
): Promise<Giveaway> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/giveaways`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok)
    throw new Error(await errMessage(res, "Nie udało się utworzyć giveawaya."));
  return res.json();
}

export async function endGiveaway(guildId: string, id: string): Promise<Giveaway> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/giveaways/${id}/end`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await errMessage(res, "Nie udało się zakończyć."));
  return res.json();
}

export async function rerollGiveaway(guildId: string, id: string): Promise<Giveaway> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/giveaways/${id}/reroll`,
    {
      method: "POST",
    },
  );
  if (!res.ok)
    throw new Error(await errMessage(res, "Nie udało się wylosować ponownie."));
  return res.json();
}

export async function cancelGiveaway(guildId: string, id: string): Promise<Giveaway> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/giveaways/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await errMessage(res, "Nie udało się anulować."));
  return res.json();
}
