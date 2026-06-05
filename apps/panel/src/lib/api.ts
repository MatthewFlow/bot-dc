const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

export type Guild = {
  id: string;
  name: string;
  icon: string | null;
  permissions: string;
};

export type EmbedFieldConfig = {
  name: string;
  value: string;
  inline?: boolean;
};

export type EmbedConfig = {
  title?: string;
  description?: string;
  /** Kolor jako liczba dziesiętna (0xRRGGBB). */
  color?: number;
  url?: string;
  authorName?: string;
  authorIconUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  timestamp?: boolean;
  fields?: EmbedFieldConfig[];
};

export type TicketPanelButton = {
  label?: string;
  emoji?: string;
};

export type AutoModAction = "delete" | "warn" | "mute";

export type AutoModConfig = {
  enabled: boolean;
  blockInvites: boolean;
  blockLinks: boolean;
  bannedWords: string[];
  spamEnabled: boolean;
  spamMaxMessages: number;
  spamWindowSeconds: number;
  exemptRoleIds: string[];
  exemptChannelIds: string[];
  action: AutoModAction;
  muteDurationSeconds: number;
};

export type ServerLogConfig = {
  enabled: boolean;
  channelId?: string;
  messageDelete: boolean;
  messageEdit: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  roleChanges: boolean;
  nicknameChanges: boolean;
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
  modLogChannelId?: string;
  adminRoleId?: string;
  ticketSupportRoleId?: string;
  ticketSupportRoleId2?: string;
  ticketLogChannelId?: string;
  welcomeEmbed?: EmbedConfig;
  goodbyeEmbed?: EmbedConfig;
  ticketPanelEmbed?: EmbedConfig;
  ticketPanelButton?: TicketPanelButton;
  autoMod?: AutoModConfig;
  serverLog?: ServerLogConfig;
};

export type ModActionType = "warn" | "mute" | "unmute" | "kick" | "ban" | "clearwarns";

export type ModAction = {
  id: string;
  guildId: string;
  type: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
  createdAt: string;
};

export type Warn = {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: string;
};

export type GuildStats = {
  /** Przybliżona liczba członków (z Discorda); null gdy niedostępna. */
  memberCount: number | null;
  /** Przybliżona liczba osób online; null gdy niedostępna. */
  onlineCount: number | null;
  /** Liczba banów na serwerze; null gdy bot nie ma uprawnień. */
  banCount: number | null;
  /** True, gdy liczba banów osiągnęła limit strony (faktycznie może być więcej). */
  banCountCapped: boolean;
  /** Łączna liczba ostrzeżeń w bazie. */
  warnCount: number;
  tickets: { total: number; pending: number; open: number; closed: number };
};

export type TicketStatus = "pending" | "open" | "closed";

export type Ticket = {
  id: string;
  guildId: string;
  threadId: string;
  userId: string;
  /** Nazwa autora ticketu (nick/username z Discorda); null jeśli nie udało się pobrać. */
  username?: string | null;
  /** Avatar autora ticketu (URL CDN Discorda); null jeśli brak/nie pobrano. */
  avatar?: string | null;
  status: TicketStatus;
  subject?: string;
  assignedTo?: string;
  /** Nazwa osoby, która przejęła ticket; null jeśli nie udało się pobrać. */
  assignedToUsername?: string | null;
  createdAt: string;
  claimedAt?: string;
  closedAt?: string;
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
  embed?: EmbedConfig;
  entries: ReactionRoleEntry[];
};

export type ReactionRoleInput = {
  channelId: string;
  embed: EmbedConfig;
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

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  const res = await fetch(`${API_URL}/guilds/${guildId}/config`, BASE);
  handleUnauthorized(res);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

/** Patch konfiguracji — embedy mogą być `null`, by je wyczyścić (powrót do trybu tekstowego). */
export type GuildConfigUpdate = Partial<
  Omit<GuildConfig, "welcomeEmbed" | "goodbyeEmbed" | "ticketPanelEmbed" | "ticketPanelButton">
> & {
  welcomeEmbed?: EmbedConfig | null;
  goodbyeEmbed?: EmbedConfig | null;
  ticketPanelEmbed?: EmbedConfig | null;
  ticketPanelButton?: TicketPanelButton | null;
};

export async function updateGuildConfig(
  guildId: string,
  patch: GuildConfigUpdate,
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

export async function createChannel(guildId: string, name: string): Promise<Channel> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create channel");
  return res.json();
}

export async function createRole(guildId: string, name: string): Promise<Role> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create role");
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

export async function getGuildStats(guildId: string): Promise<GuildStats> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch guild stats");
  return res.json();
}
