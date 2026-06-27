// Typy konfiguracji panel trzyma lokalnie (mirror typów z @jurassic-haven/db).
// NIE importujemy ich z paczki db — jej barrel ciąga runtime mongoose do grafu
// modułów (rozdyma `next dev`), a subpath `@jurassic-haven/db/types` resolver
// builda Next rozwiązuje inaczej niż `tsc` i wywala type-check. Źródłem prawdy po
// stronie db jest packages/db/types.ts; tu trzymamy jego świadomy mirror.
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
  /** Blokuj wiadomości z nadmiarem oznaczeń (lub @everyone/@here). */
  blockMassMention?: boolean;
  /** Próg oznaczeń dla mass-mention (domyślnie 5). */
  maxMentions?: number;
  /** Blokuj wiadomości pisane głównie WIELKIMI literami. */
  blockCaps?: boolean;
  /** Blokuj nadmierne powtarzanie znaków. */
  blockRepeated?: boolean;
  /** Wykrywanie raidów (wiele wejść w krótkim czasie). */
  raidEnabled?: boolean;
  raidJoinCount?: number;
  raidWindowSeconds?: number;
  raidAction?: "alert" | "kick" | "ban";
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

/** Docelowe języki tłumaczenia (kody DeepL). */
export type TranslationLang = "PL" | "EN-GB" | "DE" | "ES" | "FR";

/** Auto-tłumaczenie wiadomości z kanału-źródła (śledzone ogłoszenia gry). */
export type TranslationConfig = {
  enabled: boolean;
  sourceChannelId?: string;
  targetLang: TranslationLang;
};

export type LevelingConfig = {
  /** Płaskie XP za wiadomość (0–8). */
  messageXp?: number;
  /** Płaskie XP za każdy interwał na kanale głosowym (0–8). */
  voiceXp?: number;
  /** Co ile minut naliczać XP głosowe (5–60; domyślnie 5). */
  voiceXpInterval?: number;
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
  /** Czy bot wysyła karanemu DM z informacją o nałożonej karze. */
  dmOnPunish?: boolean;
  /** Auto-ban po osiągnięciu tylu ostrzeżeń (`0` = wyłączone). */
  autoBanThreshold?: number;
  /** Wygasanie ostrzeżeń po tylu dniach (`0` = nigdy). */
  warnDecayDays?: number;
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
  /** Auto-tłumaczenie wiadomości z kanału-źródła (śledzone ogłoszenia gry). */
  translation?: TranslationConfig;
  /** Nazwy komend wyłączonych na tym serwerze. */
  disabledCommands?: string[];
  /** Klucze modułów wyłączonych na tym serwerze. */
  disabledModules?: string[];
  /** Prefiks komend klasycznych (np. `!`). Slash-komendy działają niezależnie. */
  prefix?: string;
};

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
    | "prefix"
  >
> & {
  welcomeEmbed?: EmbedConfig | null;
  goodbyeEmbed?: EmbedConfig | null;
  ticketPanelEmbed?: EmbedConfig | null;
  feedbackPanelEmbed?: EmbedConfig | null;
  ticketPanelButton?: TicketPanelButton | null;
  levelUpEmbed?: EmbedConfig | null;
  /** Pusty prefiks czyścimy przez `null`. */
  prefix?: string | null;
};

/** Zaplanowane zadanie bota (kolejka) — na razie tylko wysyłka embeda. */
export type JobRecurrence = "once" | "daily" | "weekly";
export type BotJob = {
  id: string;
  guildId: string;
  type: "sendEmbed" | "unban" | "gameAnnounce";
  runAt: string;
  recurrence: JobRecurrence;
  status: "pending" | "done" | "error" | "cancelled";
  channelId?: string;
  embed?: EmbedConfig;
  text?: string;
  lastError?: string;
  lastRunAt?: string;
  createdBy: string;
  createdAt: string;
};

export type CreateJobInput = {
  channelId: string;
  embed: EmbedConfig;
  mode: "now" | "schedule" | "recurring";
  /** ISO — wymagane dla schedule/recurring. */
  runAt?: string;
  recurrence?: "daily" | "weekly";
};

export type GiveawayStatus = "active" | "ended" | "cancelled";

/** Giveaway (konkurs z losowaniem). Daty jako ISO (JSON). */
export type Giveaway = {
  id: string;
  guildId: string;
  channelId: string;
  messageId?: string;
  prize: string;
  winnerCount: number;
  endsAt: string;
  requiredRoleId?: string;
  hostId: string;
  status: GiveawayStatus;
  entrants: string[];
  winners: string[];
  createdAt: string;
  endedAt?: string;
};

export type CreateGiveawayInput = {
  channelId: string;
  prize: string;
  winnerCount: number;
  /** ISO — czas zakończenia (panel liczy z czasu trwania). */
  endsAt: string;
};

export type StickyMode = "text" | "embed";

/** Sticky message — utrzymywana na dole kanału. Daty jako ISO (JSON). */
export type StickyMessage = {
  id: string;
  guildId: string;
  channelId: string;
  enabled: boolean;
  mode: StickyMode;
  content?: string;
  embed?: EmbedConfig;
  lastMessageId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type StickyUpsertInput = {
  enabled: boolean;
  mode: StickyMode;
  content?: string;
  embed?: EmbedConfig;
};

/** Gracz na serwerze gry (The Isle: Evrima). */
export type GamePlayer = { id: string; name: string; dino?: string };

/** Migawka stanu serwera gry z panelu. */
export type GameServerInfo = {
  /** Czy integracja jest aktywna (bot kiedykolwiek zapisał migawkę). */
  configured: boolean;
  online: boolean;
  name: string | null;
  map: string | null;
  version: string | null;
  players: number;
  maxPlayers: number;
  /** Włączone (grywalne) dinozaury na serwerze. */
  dinos: string[];
  playerList: GamePlayer[];
  updatedAt: string | null;
};

/** Wpis audytu zmian configu (kto/kiedy/które pola). */
export type ConfigAuditEntry = {
  id: string;
  guildId: string;
  userId: string;
  username?: string;
  fields: string[];
  createdAt: string;
};

export type ModActionType =
  | "warn"
  | "mute"
  | "unmute"
  | "kick"
  | "ban"
  | "unban"
  | "clearwarns";

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

/** Statystyki paska Centrum moderacji (czysto-bazowe — szybkie). */
export type ModStats = {
  activeWarnings: number;
  bansThisWeek: number;
  /** Akcje wykonane przez automod w ostatnich 7 dniach. */
  automodActions: number;
};

/** Aktywne wyciszenie (timeout) w „Aktywnych karach". */
export type MutePunishment = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
  /** ISO — kiedy timeout wygasa. */
  until: string;
  reason: string | null;
};

/** Aktywny ban w „Aktywnych karach". */
export type BanPunishment = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
  reason: string | null;
  /** ISO wygaśnięcia (temp-ban) lub null (ban na stałe). */
  until: string | null;
};

export type ActivePunishments = {
  mutes: MutePunishment[];
  bans: BanPunishment[];
};

/** Wynik wyszukiwania członka (Karta członka). */
export type MemberSearchResult = {
  userId: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
};

/** Wpis historii akcji użytkownika — `ModAction` wzbogacony o nazwę moderatora. */
export type ModActionHistory = ModAction & { moderatorName: string | null };

/** Rola członka (do kolorowych chipów w profilu). `color` = int Discorda (0 = brak). */
export type MemberRole = { id: string; name: string; color: number };

/** Pełny profil członka (Karta członka) — live z Discorda + statystyki z bazy. */
export type MemberProfile = {
  userId: string;
  /** Czy użytkownik jest nadal na serwerze. */
  onServer: boolean;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
  /** ISO daty / null. */
  joinedAt: string | null;
  accountCreatedAt: string | null;
  /** Aktywne wyciszenie (timeout) — ISO wygaśnięcia lub null. */
  timeoutUntil: string | null;
  /** Boostuje serwer od (ISO) lub null. */
  boostingSince: string | null;
  roles: MemberRole[];
  xp: number;
  level: number;
  warnCount: number;
  ticketCount: number;
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
  /** Przyrost „w tym tygodniu" (z dat utworzenia); brak dla starszego API. */
  trends?: { bans: number; warns: number; tickets: number };
};

/** Wpis feedu „Aktywność na żywo" — moderacja, level-up albo nadanie roli. */
export type ActivityItem = {
  id: string;
  kind: "mod" | "levelup" | "role";
  userId: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
  createdAt: string;
  /** kind="mod" */
  modType?: ModActionType;
  reason?: string;
  /** kind="levelup" */
  level?: number;
  /** kind="role" */
  roleName?: string | null;
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
  /** Czy to właściciel bota (z `OWNER_DISCORD_IDS`) — odblokowuje link do owner-panelu. */
  isOwner?: boolean;
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

export type FeedbackStatus = "new" | "in_progress" | "resolved";

export type FeedbackReply = {
  authorId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

export type Feedback = {
  id: string;
  userId: string;
  username: string;
  /** Pseudonim (nick/global) rozwiązany z Discorda; null gdy nieznany. */
  displayName?: string | null;
  /** Avatar autora (URL CDN); null gdy brak/nie rozwiązano. */
  avatar?: string | null;
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  status: FeedbackStatus;
  /** Liczba głosów. */
  upvotes: number;
  /** Czy bieżący admin zagłosował. */
  upvotedByMe: boolean;
  replies: FeedbackReply[];
  createdAt: string;
};

export type FeedbackInput = {
  category: FeedbackCategory;
  message: string;
  rating?: number;
  guildId?: string;
};

export type GuildFeedback = {
  items: Feedback[];
  unread: number;
  seenAt: string | null;
};

export type BotStatus = {
  online: boolean;
  username: string | null;
  avatar: string | null;
  guildCount: number;
  /** Wersja bota (np. „2.4.1"); null gdy bot jej jeszcze nie zapisał. */
  version: string | null;
  /** Ping gatewaya w ms; null gdy niedostępny. */
  ping: number | null;
  /** ISO startu bota — panel liczy z tego żywy uptime; null gdy nieznany. */
  startedAt: string | null;
  lastSeen: string | null;
};
