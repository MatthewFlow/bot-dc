import type { EmbedConfig } from "../embed";

export type ReactionRoleEntry = {
  emoji: string;
  roleId: string;
};

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

export interface IReactionRoleRepository {
  getByMessageId(messageId: string): Promise<ReactionRole | null>;
  getByGuildId(guildId: string): Promise<ReactionRole[]>;
  /** Just the panel message IDs for a guild — cheap lookup for the bot's hot-path cache. */
  getMessageIdsByGuild(guildId: string): Promise<string[]>;
  create(data: ReactionRole): Promise<ReactionRole>;
  delete(messageId: string): Promise<void>;
}
