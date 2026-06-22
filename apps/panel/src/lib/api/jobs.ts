import { API_URL, fetchWithRetry } from "./core";
import type { BotJob, CreateJobInput, GameServerInfo } from "./types";

export async function getJobs(guildId: string): Promise<BotJob[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/jobs`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function createJob(
  guildId: string,
  input: CreateJobInput,
): Promise<{ sent: true } | BotJob> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Nie udało się zapisać zadania.");
  }
  return res.json();
}

export async function deleteJob(guildId: string, id: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/jobs/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete job");
}

export async function getGameServer(guildId: string): Promise<GameServerInfo> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/gameserver`);
  if (!res.ok) throw new Error("Failed to fetch game server");
  return res.json();
}

export async function getGameAnnounces(guildId: string): Promise<BotJob[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/gameserver/announces`);
  if (!res.ok) throw new Error("Failed to fetch announces");
  return res.json();
}

export async function createGameAnnounce(
  guildId: string,
  message: string,
  minutes?: number,
): Promise<BotJob> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/gameserver/announce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, minutes }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Nie udało się zlecić ogłoszenia.");
  }
  return res.json();
}

export async function cancelGameAnnounce(guildId: string, id: string): Promise<void> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/gameserver/announces/${id}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to cancel announce");
}
