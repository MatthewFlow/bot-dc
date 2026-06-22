import { API_URL, fetchWithRetry } from "./core";
import type {
  ActivePunishments,
  MemberProfile,
  MemberSearchResult,
  ModAction,
  ModActionHistory,
  ModStats,
  Ticket,
  TicketStatus,
  Warn,
} from "./types";

export async function getWarnings(guildId: string, userId: string): Promise<Warn[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/warnings/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch warnings");
  return res.json();
}

export async function clearWarnings(guildId: string, userId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/warnings/${userId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to clear warnings");
}

export async function getTickets(
  guildId: string,
  status?: TicketStatus,
): Promise<Ticket[]> {
  const query = status ? `?status=${status}` : "";
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/tickets${query}`);
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

export async function getModActions(guildId: string, limit = 25): Promise<ModAction[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/mod-actions?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch mod actions");
  return res.json();
}

export async function getModStats(guildId: string): Promise<ModStats> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/mod-stats`);
  if (!res.ok) throw new Error("Failed to fetch mod stats");
  return res.json();
}

export async function getActivePunishments(guildId: string): Promise<ActivePunishments> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/active-punishments`);
  if (!res.ok) throw new Error("Failed to fetch active punishments");
  return res.json();
}

export async function searchMembers(
  guildId: string,
  q: string,
): Promise<MemberSearchResult[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/members/search?q=${encodeURIComponent(q)}`,
  );
  if (!res.ok) throw new Error("Failed to search members");
  return res.json();
}

export async function getMemberHistory(
  guildId: string,
  userId: string,
): Promise<ModActionHistory[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/mod-actions/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch member history");
  return res.json();
}

export async function getMemberProfile(
  guildId: string,
  userId: string,
): Promise<MemberProfile> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/members/${userId}/profile`,
  );
  if (!res.ok) throw new Error("Failed to fetch member profile");
  return res.json();
}

// ── Akcje moderacyjne wykonywane z panelu ────────────────────────────────────
// Wspólna ścieżka: przy błędzie (np. 502 z hierarchii ról) rzuca Error z
// komunikatem serwera, więc strona pokaże go wprost w toaście.
async function postModAction<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetchWithRetry(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Akcja nie powiodła się.");
  }
  return res.json();
}

export function warnUser(
  guildId: string,
  userId: string,
  reason?: string,
): Promise<{ warnCount: number; autoBanned: boolean }> {
  return postModAction(`${API_URL}/guilds/${guildId}/actions/warn`, { userId, reason });
}

export function muteUser(
  guildId: string,
  userId: string,
  minutes: number,
  reason?: string,
): Promise<{ ok: true }> {
  return postModAction(`${API_URL}/guilds/${guildId}/actions/mute`, {
    userId,
    minutes,
    reason,
  });
}

export function kickUser(
  guildId: string,
  userId: string,
  reason?: string,
): Promise<{ ok: true }> {
  return postModAction(`${API_URL}/guilds/${guildId}/actions/kick`, { userId, reason });
}

export function banUser(
  guildId: string,
  userId: string,
  reason?: string,
  deleteDays?: number,
  minutes?: number,
): Promise<{ ok: true }> {
  return postModAction(`${API_URL}/guilds/${guildId}/actions/ban`, {
    userId,
    reason,
    deleteDays,
    minutes,
  });
}

export function unmuteUser(guildId: string, userId: string): Promise<{ ok: true }> {
  return postModAction(`${API_URL}/guilds/${guildId}/actions/unmute`, { userId });
}

export function unbanUser(guildId: string, userId: string): Promise<{ ok: true }> {
  return postModAction(`${API_URL}/guilds/${guildId}/bans/${userId}`, null, "DELETE");
}

export async function sendTicketPanel(guildId: string, channelId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/ticket-panel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelId }),
  });
  if (!res.ok) throw new Error("Failed to send ticket panel");
}

export async function closeTicket(guildId: string, threadId: string): Promise<void> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/tickets/${threadId}/close`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to close ticket");
}

export async function reopenTicket(guildId: string, threadId: string): Promise<void> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/tickets/${threadId}/reopen`,
    { method: "POST" },
  );
  if (!res.ok) throw new Error("Failed to reopen ticket");
}

export async function deleteTicket(guildId: string, threadId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/tickets/${threadId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete ticket");
}
