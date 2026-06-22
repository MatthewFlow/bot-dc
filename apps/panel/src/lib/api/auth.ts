import { userSchema } from "../schemas";
import { API_URL, BASE, fetchWithRetry, handleUnauthorized } from "./core";
import type { Guild, User } from "./types";

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, BASE);
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to fetch user");
  return userSchema.parse(await res.json());
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {});
}

export async function getGuilds(): Promise<Guild[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds`);
  if (!res.ok) throw new Error("Failed to fetch guilds");
  return res.json();
}
