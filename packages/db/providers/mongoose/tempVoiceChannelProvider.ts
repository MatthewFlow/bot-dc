import type {
  CreateTempVoiceOpts,
  ITempVoiceChannelRepository,
  TempVoiceChannel,
} from "../../repositories/tempVoiceChannelRepository";
import { TempVoiceChannelModel } from "./schemas/tempVoiceChannel.schema";

function toTempVoice(doc: InstanceType<typeof TempVoiceChannelModel>): TempVoiceChannel {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    channelId: doc.channelId,
    hubChannelId: doc.hubChannelId,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt,
  };
}

export class TempVoiceChannelProvider implements ITempVoiceChannelRepository {
  async add(opts: CreateTempVoiceOpts): Promise<TempVoiceChannel> {
    const doc = await TempVoiceChannelModel.create(opts);
    return toTempVoice(doc);
  }

  async getByChannel(channelId: string): Promise<TempVoiceChannel | null> {
    const doc = await TempVoiceChannelModel.findOne({ channelId });
    return doc ? toTempVoice(doc) : null;
  }

  async countByHub(guildId: string, hubChannelId: string): Promise<number> {
    return TempVoiceChannelModel.countDocuments({ guildId, hubChannelId });
  }

  async getAll(): Promise<TempVoiceChannel[]> {
    const docs = await TempVoiceChannelModel.find();
    return docs.map(toTempVoice);
  }

  async delete(channelId: string): Promise<void> {
    await TempVoiceChannelModel.deleteOne({ channelId });
  }
}
