import { queryClient } from "./queryClient";
import { botStatusSchema, feedbackInputSchema, userSchema } from "./schemas";

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
  exemptRoleIds: string[];
  exemptChannelIds: string[];
};

export type LevelingConfig = {
  /** Płaskie XP za wiadomość (0–8). */
  messageXp?: number;
  /** Płaskie XP za każdą minutę na kanale głosowym powyżej 1. minuty (0–8). */
  voiceXp?: number;
  /** Legacy mnożnik bazowego XP — zastąpiony przez `messageXp`. */
  xpMultiplier?: number;
  noXpChannelIds: string[];
  noXpRoleIds: string[];
  levelUpEnabled: boolean;
  levelUpDm: boolean;
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
  feedbackChannelId?: string;
  adminRoleId?: string;
  ticketSupportRoleId?: string;
  ticketSupportRoleId2?: string;
  ticketLogChannelId?: string;
  welcomeEmbed?: EmbedConfig;
  goodbyeEmbed?: EmbedConfig;
  ticketPanelEmbed?: EmbedConfig;
  feedbackPanelEmbed?: EmbedConfig;
  ticketPanelButton?: TicketPanelButton;
  levelUpEmbed?: EmbedConfig;
  autoMod?: AutoModConfig;
  serverLog?: ServerLogConfig;
  leveling?: LevelingConfig;
  /** Nazwy komend wyłączonych na tym serwerze. */
  disabledCommands?: string[];
};

export type ModActionType = "warn" | "mute" | "unmute" | "kick" | "ban" | "clearwarns";

export type ModAction = {
  id: string;
  guildId: string;
  type: ModActionType;
  userId: string;
  /** Pseudonim (nick/display name) ukaranego użytkownika; null gdy nie pobrano. */
  displayName?: string | null;
  /** Nazwa (@handle) ukaranego użytkownika; null gdy nie pobrano. */
  username?: string | null;
  /** Avatar ukaranego użytkownika (URL CDN Discorda); null gdy brak/nie pobrano. */
  avatar?: string | null;
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
  /** Pseudonim autora ticketu (nick/display name z Discorda); null jeśli nie pobrano. */
  username?: string | null;
  /** Nazwa (@handle) autora ticketu; null jeśli nie pobrano. */
  userTag?: string | null;
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
  /** Pseudonim (display name) konta; null gdy nieustawiony — wtedy pokazujemy username. */
  displayName?: string | null;
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

export type ButtonRoleEntry = { label: string; emoji?: string; roleId: string };

export type ButtonRole = {
  guildId: string;
  channelId: string;
  messageId: string;
  embed?: EmbedConfig;
  entries: ButtonRoleEntry[];
};

export type ButtonRoleInput = {
  channelId: string;
  embed: EmbedConfig;
  entries: ButtonRoleEntry[];
};

export type LeaderboardEntry = {
  position: number;
  userId: string;
  /** Pseudonim (nick/display name); fallback na ID gdy nie pobrano członka. */
  displayName: string;
  /** Nazwa (@handle); null gdy nie pobrano. */
  username: string | null;
  avatar: string | null;
  xp: number;
  level: number;
};

export type FeedbackCategory = "bug" | "suggestion" | "other";

export type Feedback = {
  id: string;
  userId: string;
  username: string;
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  createdAt: string;
};

export type FeedbackInput = {
  category: FeedbackCategory;
  message: string;
  rating?: number;
  guildId?: string;
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

// ── Warstwa cache odczytów — magazynem jest TanStack Query ───────────────────
// Config/role/kanały rzadko się zmieniają, a role/channels proxują do Discorda
// (wolno). `swr` zachowuje dotychczasowy UX: jeśli coś jest w cache, zwraca to
// NATYCHMIAST (także nieświeże) i odświeża w tle; pierwszy odczyt (pusty cache)
// czeka na sieć. Dedup współbieżnych odczytów daje `queryClient.fetchQuery`.
const STALE_MS = 300_000;

/** Fabryka kluczy zapytań — wspólna dla fetcherów (poniżej) i hooków useQuery. */
export const queryKeys = {
  me: () => ["me"] as const,
  guilds: () => ["guilds"] as const,
  config: (g: string) => ["config", g] as const,
  channels: (g: string) => ["channels", g] as const,
  roles: (g: string) => ["roles", g] as const,
  leaderboard: (g: string, limit: number) => ["leaderboard", g, limit] as const,
  stats: (g: string) => ["stats", g] as const,
  reactionRoles: (g: string) => ["reaction-roles", g] as const,
  buttonRoles: (g: string) => ["button-roles", g] as const,
  tickets: (g: string, status?: TicketStatus) => ["tickets", g, status ?? "all"] as const,
  modActions: (g: string, limit: number) => ["mod-actions", g, limit] as const,
  warnings: (g: string, userId: string) => ["warnings", g, userId] as const,
  botStatus: () => ["bot-status"] as const,
  guildFeedback: (g: string) => ["guild-feedback", g] as const,
  myFeedback: () => ["my-feedback"] as const,
};

function swr<T>(key: readonly unknown[], fetcher: () => Promise<T>): Promise<T> {
  const cached = queryClient.getQueryData<T>(key);
  if (cached !== undefined) {
    const state = queryClient.getQueryState(key);
    const stale = !state || Date.now() - state.dataUpdatedAt >= STALE_MS;
    if (stale) {
      void queryClient
        .fetchQuery({ queryKey: key, queryFn: fetcher, staleTime: STALE_MS })
        .catch(() => {});
    }
    return Promise.resolve(cached);
  }
  return queryClient.fetchQuery({ queryKey: key, queryFn: fetcher, staleTime: STALE_MS });
}

/** Czyści cache odczytów serwera (jeden rodzaj albo config+channels+roles). Po mutacjach. */
export function invalidateGuildCache(
  guildId: string,
  kind?: "config" | "channels" | "roles",
): void {
  const keys: readonly (readonly unknown[])[] = kind
    ? [[kind, guildId]]
    : [queryKeys.config(guildId), queryKeys.channels(guildId), queryKeys.roles(guildId)];
  for (const key of keys) queryClient.removeQueries({ queryKey: key });
}

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

export function getGuildConfig(guildId: string): Promise<GuildConfig> {
  return swr(queryKeys.config(guildId), async () => {
    const res = await fetch(`${API_URL}/guilds/${guildId}/config`, BASE);
    handleUnauthorized(res);
    if (!res.ok) throw new Error("Failed to fetch config");
    return (await res.json()) as GuildConfig;
  });
}

/** Patch konfiguracji — embedy mogą być `null`, by je wyczyścić (powrót do trybu tekstowego). */
export type GuildConfigUpdate = Partial<
  Omit<
    GuildConfig,
    | "welcomeEmbed"
    | "goodbyeEmbed"
    | "ticketPanelEmbed"
    | "feedbackPanelEmbed"
    | "ticketPanelButton"
    | "levelUpEmbed"
  >
> & {
  welcomeEmbed?: EmbedConfig | null;
  goodbyeEmbed?: EmbedConfig | null;
  ticketPanelEmbed?: EmbedConfig | null;
  feedbackPanelEmbed?: EmbedConfig | null;
  ticketPanelButton?: TicketPanelButton | null;
  levelUpEmbed?: EmbedConfig | null;
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
  invalidateGuildCache(guildId, "config");
}

export function getChannels(guildId: string): Promise<Channel[]> {
  return swr(queryKeys.channels(guildId), async () => {
    const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/channels`);
    if (!res.ok) throw new Error("Failed to fetch channels");
    return (await res.json()) as Channel[];
  });
}

export function getRoles(guildId: string): Promise<Role[]> {
  return swr(queryKeys.roles(guildId), async () => {
    const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/roles`);
    if (!res.ok) throw new Error("Failed to fetch roles");
    return (await res.json()) as Role[];
  });
}

/**
 * Rozgrzewa cache współdzielony (config + role + kanały) dla serwera, żeby kolejne
 * wejścia na podstrony były natychmiastowe. Fire-and-forget — błędy ujawnią się
 * dopiero, gdy dana strona faktycznie poprosi o te dane.
 */
export function prefetchGuildData(guildId: string): void {
  void getGuildConfig(guildId).catch(() => {});
  void getChannels(guildId).catch(() => {});
  void getRoles(guildId).catch(() => {});
}

export async function createChannel(guildId: string, name: string): Promise<Channel> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create channel");
  invalidateGuildCache(guildId, "channels");
  return res.json();
}

export async function createRole(guildId: string, name: string): Promise<Role> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create role");
  invalidateGuildCache(guildId, "roles");
  return res.json();
}

/** Surowy fetcher (bez cache) — używany jako queryFn w useQuery, by uniknąć
 *  rekurencji swr→fetchQuery na tym samym kluczu. Imperatywnie używaj getLeaderboard. */
export async function fetchLeaderboard(
  guildId: string,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const res = await fetchWithRetry(
    `${API_URL}/guilds/${guildId}/leaderboard?limit=${limit}`,
  );
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return (await res.json()) as LeaderboardEntry[];
}

export function getLeaderboard(
  guildId: string,
  limit = 10,
  force = false,
): Promise<LeaderboardEntry[]> {
  const key = queryKeys.leaderboard(guildId, limit);
  if (force) queryClient.removeQueries({ queryKey: key });
  return swr(key, () => fetchLeaderboard(guildId, limit));
}

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

export type BotStatus = {
  online: boolean;
  username: string | null;
  avatar: string | null;
  guildCount: number;
  lastSeen: string | null;
};

/** Status bota (online/offline) na podstawie heartbeatu w bazie. */
export async function getBotStatus(): Promise<BotStatus> {
  const res = await fetchWithRetry(`${API_URL}/bot/status`);
  if (!res.ok) throw new Error("Failed to fetch bot status");
  return botStatusSchema.parse(await res.json());
}

/** Surowy fetcher (bez cache) — queryFn dla useQuery (patrz fetchLeaderboard). */
export async function fetchGuildStats(guildId: string): Promise<GuildStats> {
  const res = await fetchWithRetry(`${API_URL}/guilds/${guildId}/stats`);
  if (!res.ok) throw new Error("Failed to fetch guild stats");
  return (await res.json()) as GuildStats;
}

export function getGuildStats(guildId: string): Promise<GuildStats> {
  return swr(queryKeys.stats(guildId), () => fetchGuildStats(guildId));
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

export type GuildFeedback = {
  items: Feedback[];
  unread: number;
  seenAt: string | null;
};

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
