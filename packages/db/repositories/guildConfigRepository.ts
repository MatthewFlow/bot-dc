import type {
  AutoModConfig,
  EmbedConfig,
  LevelingConfig,
  RoleReward,
  ServerLogConfig,
  TicketPanelButton,
} from "../types";

export type { AutoModConfig, LevelingConfig, ServerLogConfig, TicketPanelButton };

export type GuildConfig = {
  guildId: string;
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  joinRoleId?: string;
  verifiedRoleId?: string;
  welcomeMessage?: string;
  goodbyeMessage?: string;
  roleRewards: RoleReward[];
  modLogChannelId?: string;
  /** Czy bot wysyła karanemu użytkownikowi DM z informacją o nałożonej karze. */
  dmOnPunish?: boolean;
  /** Auto-ban po osiągnięciu tylu ostrzeżeń (`0`/brak = wyłączone). */
  autoBanThreshold?: number;
  /** Wygasanie ostrzeżeń po tylu dniach (`0`/brak = nigdy). */
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
  disabledCommands?: string[];
  /** Klucze modułów wyłączonych na tym serwerze. */
  disabledModules?: string[];
  /** Prefiks komend klasycznych (np. `!`). Slash-komendy działają niezależnie. */
  prefix?: string;
};

export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId">>;

export interface IGuildConfigRepository {
  get(guildId: string): Promise<GuildConfig | null>;
  set(guildId: string, patch: GuildConfigPatch): Promise<void>;
}
