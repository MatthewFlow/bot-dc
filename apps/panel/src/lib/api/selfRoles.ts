import { API_URL, fetchWithRetry } from "./core";
import type {
  ButtonRole,
  ButtonRoleInput,
  ReactionRole,
  ReactionRoleInput,
} from "./types";

export async function getReactionRoles(guildId: string): Promise<ReactionRole[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/reaction-roles`);
  if (!res.ok) throw new Error("Failed to fetch reaction roles");
  return res.json();
}

export async function publishReactionRole(
  guildId: string,
  data: ReactionRoleInput,
): Promise<ReactionRole> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/reaction-roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to publish reaction role");
  return res.json();
}

export async function deleteReactionRole(
  guildId: string,
  messageId: string,
): Promise<void> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/reaction-roles/${messageId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete reaction role");
}

export async function getButtonRoles(guildId: string): Promise<ButtonRole[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/button-roles`);
  if (!res.ok) throw new Error("Failed to fetch button roles");
  return res.json();
}

export async function publishButtonRole(
  guildId: string,
  data: ButtonRoleInput,
): Promise<ButtonRole> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/button-roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(err?.error || "Failed to publish button role");
  }
  return res.json();
}

export async function deleteButtonRole(
  guildId: string,
  messageId: string,
): Promise<void> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/button-roles/${messageId}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error("Failed to delete button role");
}
