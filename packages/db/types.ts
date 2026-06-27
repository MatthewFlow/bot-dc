// Czyste typy domenowe — BEZ importu mongoose. Bezpieczne do importu z panelu
// przez `@jurassic-haven/db/types` (wyłącznie `import type`), więc nigdy nie
// wciąga runtime'owego barrela (a z nim mongoose) do bundla Next.js. Zarówno
// schemat mongoose, jak i warstwa repozytoriów importują te kształty stąd —
// to jedyne źródło prawdy dla współdzielonych typów konfiguracji.

export type { DiscordEmbed, EmbedConfig, EmbedFieldConfig } from "./embed";

export type RoleReward = {
  level: number;
  roleId: string;
};

/** Konfiguracja „kanału-twórcy" (join-to-create) — bot tworzy temp-kanał po wejściu. */
export type AutoVoiceHub = {
  /** Kanał głosowy „twórca" — wejście na niego tworzy nowy temp-kanał. */
  channelId: string;
  /** Kategoria, w której powstają temp-kanały (domyślnie kategoria twórcy). */
  categoryId?: string;
  /** Szablon nazwy temp-kanału: `{user}` = nick, `{count}` = numer kolejny. */
  nameTemplate?: string;
  /** Limit osób na temp-kanale (0/brak = bez limitu). */
  userLimit?: number;
};

/** Personalizacja przycisku pod embedem panelu ticketów. */
export type TicketPanelButton = {
  label?: string;
  emoji?: string;
};

/** Konfiguracja logów serwera (kanał + przełączniki kategorii). Brak obiektu = wyłączone. */
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

/** Dodatkowe ustawienia systemu poziomów. Brak obiektu = wartości domyślne. */
export type LevelingConfig = {
  /** Płaskie XP za wiadomość (0–8). */
  messageXp?: number;
  /** Płaskie XP za każdy interwał na kanale głosowym (0–8). */
  voiceXp?: number;
  /** Co ile minut naliczać XP głosowe (5–60; domyślnie 5). */
  voiceXpInterval?: number;
  /** Legacy: mnożnik bazowego XP (15/wiadomość). Używany tylko gdy `messageXp` nieustawione. */
  xpMultiplier?: number;
  noXpChannelIds: string[];
  noXpRoleIds: string[];
  levelUpEnabled: boolean;
  levelUpDm: boolean;
};

/** Docelowe języki tłumaczenia (kody DeepL). */
export type TranslationLang = "PL" | "EN-GB" | "DE" | "ES" | "FR";

/**
 * Auto-tłumaczenie wiadomości z kanału-źródła (np. śledzone ogłoszenia gry).
 * Brak obiektu = wyłączone. Tłumaczenie publikuje bot jako embed pod oryginałem.
 */
export type TranslationConfig = {
  enabled: boolean;
  /** Kanał, którego nowe wiadomości bot tłumaczy. */
  sourceChannelId?: string;
  /** Język docelowy (kod DeepL). */
  targetLang: TranslationLang;
};

export type AutoModAction = "delete" | "warn" | "mute";

/** Konfiguracja auto-moderacji (filtry + akcja). Brak obiektu = wyłączone. */
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
  /** Blokuj nadmierne powtarzanie znaków (np. „aaaaaaaaaa"). */
  blockRepeated?: boolean;
  /** Wykrywanie raidów (wiele wejść w krótkim czasie). */
  raidEnabled?: boolean;
  /** Próg wejść uznawany za raid (domyślnie 10). */
  raidJoinCount?: number;
  /** Okno czasowe raidu w sekundach (domyślnie 10). */
  raidWindowSeconds?: number;
  /** Reakcja na raid: tylko alert, albo dodatkowo kick/ban świeżych wejść. */
  raidAction?: "alert" | "kick" | "ban";
};
