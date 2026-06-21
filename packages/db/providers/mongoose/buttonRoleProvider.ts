import type {
  ButtonRole,
  IButtonRoleRepository,
} from "../../repositories/buttonRoleRepository";
import { ButtonRoleModel } from "./schemas/buttonRole.schema";

export class ButtonRoleProvider implements IButtonRoleRepository {
  async getByGuildId(guildId: string): Promise<ButtonRole[]> {
    const docs = await ButtonRoleModel.find({ guildId }).lean();
    return docs.map((doc) => ({
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      embed: doc.embed,
      entries: doc.entries ?? [],
      style: doc.style,
    }));
  }

  async getByMessageId(messageId: string): Promise<ButtonRole | null> {
    const doc = await ButtonRoleModel.findOne({ messageId }).lean();
    if (!doc) return null;
    return {
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      embed: doc.embed,
      entries: doc.entries ?? [],
      style: doc.style,
    };
  }

  async create(data: ButtonRole): Promise<ButtonRole> {
    const doc = await ButtonRoleModel.create(data);
    return {
      guildId: doc.guildId,
      channelId: doc.channelId,
      messageId: doc.messageId,
      embed: doc.embed,
      entries: doc.entries ?? [],
      style: doc.style,
    };
  }

  async delete(messageId: string): Promise<void> {
    await ButtonRoleModel.deleteOne({ messageId });
  }
}
