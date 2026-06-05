import type { EmbedConfig } from "../embed";
import type {
  AutoModConfig,
  RoleReward,
  ServerLogConfig,
  TicketPanelButton,
} from "../providers/mongoose/schemas/guildConfig.schema";

export type { AutoModConfig, ServerLogConfig, TicketPanelButton };

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

export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId">>;

export interface IGuildConfigRepository {
  get(guildId: string): Promise<GuildConfig | null>;
  set(guildId: string, patch: GuildConfigPatch): Promise<void>;
}
