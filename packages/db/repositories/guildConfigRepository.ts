import type { RoleReward } from "../providers/mongoose/schemas/guildConfig.schema";

export type GuildConfig = {
  guildId: string;
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  joinRoleId?: string;
  welcomeMessage?: string;
  goodbyeMessage?: string;
  roleRewards: RoleReward[];
};

export type GuildConfigPatch = Partial<Omit<GuildConfig, "guildId">>;

export interface IGuildConfigRepository {
  get(guildId: string): Promise<GuildConfig | null>;
  set(guildId: string, patch: GuildConfigPatch): Promise<void>;
}
