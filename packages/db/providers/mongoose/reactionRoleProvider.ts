import type {
  IReactionRoleRepository,
  ReactionRole,
} from "../../repositories/reactionRoleRepository";
import { ReactionRoleModel } from "./schemas/reactionRole.schema";

export class ReactionRoleProvider implements IReactionRoleRepository {
  async getByMessageId(messageId: string): Promise<ReactionRole | null> {
    const doc = await ReactionRoleModel.findOne({ messageId }).lean();
    if (!doc) return null;

    return {
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      title: doc.title,
      content: doc.content,
      color: doc.color,
      embed: doc.embed,
      entries: doc.entries ?? [],
    };
  }

  async getByGuildId(guildId: string): Promise<ReactionRole[]> {
    const docs = await ReactionRoleModel.find({ guildId }).lean();
    return docs.map((doc) => ({
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      title: doc.title,
      content: doc.content,
      color: doc.color,
      entries: doc.entries ?? [],
    }));
  }

  async getMessageIdsByGuild(guildId: string): Promise<string[]> {
    const docs = await ReactionRoleModel.find({ guildId }, { messageId: 1 }).lean();
    return docs.map((doc) => doc.messageId);
  }

  async create(data: ReactionRole): Promise<ReactionRole> {
    const doc = await ReactionRoleModel.create(data);
    return {
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      title: doc.title,
      content: doc.content,
      color: doc.color,
      embed: doc.embed,
      entries: doc.entries ?? [],
    };
  }

  async delete(messageId: string): Promise<void> {
    await ReactionRoleModel.deleteOne({ messageId });
  }
}
