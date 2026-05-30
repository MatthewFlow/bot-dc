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

  async create(data: ReactionRole): Promise<ReactionRole> {
    const doc = await ReactionRoleModel.create(data);
    return {
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      title: doc.title,
      content: doc.content,
      color: doc.color,
      entries: doc.entries ?? [],
    };
  }

  async delete(messageId: string): Promise<void> {
    await ReactionRoleModel.deleteOne({ messageId });
  }
}
