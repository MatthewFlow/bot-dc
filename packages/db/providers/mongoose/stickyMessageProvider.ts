import type {
  IStickyMessageRepository,
  StickyMessage,
  UpsertStickyOpts,
} from "../../repositories/stickyMessageRepository";
import { StickyMessageModel } from "./schemas/stickyMessage.schema";

function toSticky(doc: InstanceType<typeof StickyMessageModel>): StickyMessage {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    channelId: doc.channelId,
    enabled: doc.enabled,
    mode: doc.mode,
    content: doc.content,
    embed: doc.embed,
    lastMessageId: doc.lastMessageId,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class StickyMessageProvider implements IStickyMessageRepository {
  async upsert(opts: UpsertStickyOpts): Promise<StickyMessage> {
    const { guildId, channelId, ...rest } = opts;
    const doc = await StickyMessageModel.findOneAndUpdate(
      { guildId, channelId },
      { ...rest, updatedAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return toSticky(doc);
  }

  async getByGuild(guildId: string): Promise<StickyMessage[]> {
    const docs = await StickyMessageModel.find({ guildId }).sort({ updatedAt: -1 });
    return docs.map(toSticky);
  }

  async getByChannel(guildId: string, channelId: string): Promise<StickyMessage | null> {
    const doc = await StickyMessageModel.findOne({ guildId, channelId });
    return doc ? toSticky(doc) : null;
  }

  async setLastMessageId(id: string, messageId: string | null): Promise<void> {
    await StickyMessageModel.updateOne(
      { _id: id },
      messageId === null
        ? { $unset: { lastMessageId: "" } }
        : { lastMessageId: messageId },
    );
  }

  async delete(guildId: string, channelId: string): Promise<StickyMessage | null> {
    const doc = await StickyMessageModel.findOneAndDelete({ guildId, channelId });
    return doc ? toSticky(doc) : null;
  }
}
