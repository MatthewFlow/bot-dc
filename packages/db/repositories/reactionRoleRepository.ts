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
  entries: ReactionRoleEntry[];
};

export interface IReactionRoleRepository {
  getByMessageId(messageId: string): Promise<ReactionRole | null>;
  getByGuildId(guildId: string): Promise<ReactionRole[]>;
  create(data: ReactionRole): Promise<ReactionRole>;
  delete(messageId: string): Promise<void>;
}
