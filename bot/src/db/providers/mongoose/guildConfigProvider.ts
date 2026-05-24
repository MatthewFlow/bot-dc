import type {
  GuildConfig,
  GuildConfigPatch,
  IGuildConfigRepository,
} from "../../repositories/guildConfigRepository";
import { GuildConfigModel } from "./schemas/guildConfig.schema";

export class GuildConfigProvider implements IGuildConfigRepository {
  async get(guildId: string): Promise<GuildConfig | null> {
    const doc = await GuildConfigModel.findOne({ guildId }).lean();
    if (!doc) return null;

    return {
      guildId: doc.guildId,
      welcomeChannelId: doc.welcomeChannelId,
      goodbyeChannelId: doc.goodbyeChannelId,
      levelUpChannelId: doc.levelUpChannelId,
      roleRewards: doc.roleRewards ?? [],
    };
  }

  async set(guildId: string, patch: GuildConfigPatch): Promise<void> {
    await GuildConfigModel.findOneAndUpdate(
      { guildId },
      { $set: patch },
      { upsert: true, new: true },
    );
  }
}
