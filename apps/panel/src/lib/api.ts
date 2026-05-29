const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
};

export type GuildConfig = {
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  joinRoleId?: string;
  roleRewards?: Array<{ level: number; roleId: string }>;
};

export type Channel = {
  id: string;
  name: string;
  type: number;
};

export type Role = {
  id: string;
  name: string;
  position: number;
};

export type User = {
  userId: string;
  username: string;
  avatar: string | null;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 429 && retries > 0) {
    const data = await res.clone().json() as { retry_after?: number };
    const delay = (data.retry_after ?? 1) * 1000;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1);
  }

  return res;
}

export async function getMe(token: string): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function getGuilds(token: string): Promise<Guild[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("Failed to fetch guilds");
  return res.json();
}

export async function getGuildConfig(token: string, guildId: string): Promise<GuildConfig> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function updateGuildConfig(
  token: string,
  guildId: string,
  patch: Partial<GuildConfig>,
): Promise<void> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update config");
}

export async function getChannels(token: string, guildId: string): Promise<Channel[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/channels`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json();
}

export async function getRoles(token: string, guildId: string): Promise<Role[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/roles`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}