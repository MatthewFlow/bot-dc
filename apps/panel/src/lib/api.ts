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
  verifiedRoleId?: string;
  welcomeMessage?: string;
  goodbyeMessage?: string;
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

export type ReactionRoleEntry = { emoji: string; roleId: string };

export type ReactionRole = {
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  content: string;
  color?: string;
  entries: ReactionRoleEntry[];
};

export type ReactionRoleInput = {
  channelId: string;
  title: string;
  content: string;
  color?: string;
  entries: ReactionRoleEntry[];
};

export type LeaderboardEntry = {
  position: number;
  userId: string;
  username: string;
  avatar: string | null;
  xp: number;
  level: number;
};

export class TokenExpiredError extends Error {
  constructor() {
    super("Token expired");
    this.name = "TokenExpiredError";
  }
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    window.location.href = "/";
    throw new TokenExpiredError();
  }
}

const BASE: RequestInit = { credentials: "include" };

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
): Promise<Response> {
  const res = await fetch(url, { ...BASE, ...options });

  if (res.status === 401) handleUnauthorized(res);

  if (res.status === 429 && retries > 0) {
    const data = (await res.clone().json()) as { retry_after?: number };
    const delay = (data.retry_after ?? 1) * 1000;
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, options, retries - 1);
  }

  return res;
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${API_URL}/auth/me`, BASE);
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function getGuilds(): Promise<Guild[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds`);
  if (!res.ok) throw new Error("Failed to fetch guilds");
  return res.json();
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, BASE);
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function updateGuildConfig(
  guildId: string,
  patch: Partial<GuildConfig>,
): Promise<void> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, {
    ...BASE,
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to update config");
}

export async function getChannels(guildId: string): Promise<Channel[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/channels`);
  if (!res.ok) throw new Error("Failed to fetch channels");
  return res.json();
}

export async function getRoles(guildId: string): Promise<Role[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/roles`);
  if (!res.ok) throw new Error("Failed to fetch roles");
  return res.json();
}

export async function getLeaderboard(
  guildId: string,
  limit = 10,
): Promise<LeaderboardEntry[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/leaderboard?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function getReactionRoles(guildId: string): Promise<ReactionRole[]> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/reaction-roles`);
  if (!res.ok) throw new Error("Failed to fetch reaction roles");
  return res.json();
}

export async function publishReactionRole(
  guildId: string,
  data: ReactionRoleInput,
): Promise<void> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/reaction-roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to publish reaction role");
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
