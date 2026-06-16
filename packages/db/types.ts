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
  /** Płaskie XP za każdą minutę na kanale głosowym powyżej 1. minuty (0–8). */
  voiceXp?: number;
  /** Legacy: mnożnik bazowego XP (15/wiadomość). Używany tylko gdy `messageXp` nieustawione. */
  xpMultiplier?: number;
  noXpChannelIds: string[];
  noXpRoleIds: string[];
  levelUpEnabled: boolean;
  levelUpDm: boolean;
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
};
