import { feedbackInputSchema } from "../schemas";
import { API_URL, fetchWithRetry } from "./core";
import type { Feedback, FeedbackInput, FeedbackStatus, GuildFeedback } from "./types";

/** Wysyła panel feedbacku (embed + przycisk) na skonfigurowany kanał feedbacku. */
export async function sendFeedbackPanel(guildId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/feedback-panel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Failed to send feedback panel");
  }
}

export async function submitFeedback(input: FeedbackInput): Promise<Feedback> {
  // Walidacja kontraktu przed wysyłką (ten sam kształt, który egzekwuje API).
  const body = feedbackInputSchema.parse(input);
  const res = await fetchWithRetry(`${API_URL}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit feedback");
  return res.json();
}

export async function getMyFeedback(): Promise<Feedback[]> {
  const res = await fetchWithRetry(`${API_URL}/feedback/mine`);
  if (!res.ok) throw new Error("Failed to fetch feedback");
  return res.json();
}

/** Feedbacki serwera + liczba nieprzeczytanych dla bieżącego admina (dzwoneczek). */
export async function getGuildFeedback(guildId: string): Promise<GuildFeedback> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/feedback`);
  if (!res.ok) throw new Error("Failed to fetch guild feedback");
  return res.json();
}

/** Oznacza feedbacki serwera jako przeczytane do teraz. */
export async function markFeedbackSeen(guildId: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/feedback/seen`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to mark feedback seen");
}

/** Usuwa zgłoszenie z serwera (admin). */
export async function deleteGuildFeedback(guildId: string, id: string): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/feedback/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete feedback");
}

/** Zmienia status zgłoszenia; zwraca zaktualizowany rekord. */
export async function setGuildFeedbackStatus(
  guildId: string,
  id: string,
  status: FeedbackStatus,
): Promise<Feedback> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/feedback/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

/** Przełącza głos bieżącego admina; zwraca zaktualizowany rekord. */
export async function toggleGuildFeedbackUpvote(
  guildId: string,
  id: string,
): Promise<Feedback> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/feedback/${id}/upvote`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to toggle upvote");
  return res.json();
}

/** Dodaje odpowiedź ekipy; zwraca zaktualizowany rekord. */
export async function addGuildFeedbackReply(
  guildId: string,
  id: string,
  message: string,
): Promise<Feedback> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/feedback/${id}/replies`,
    { method: "POST", body: JSON.stringify({ message }) },
  );
  if (!res.ok) throw new Error("Failed to add reply");
  return res.json();
}
