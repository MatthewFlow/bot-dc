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
      joinRoleId: doc.joinRoleId,
      verifiedRoleId: doc.verifiedRoleId,
      welcomeMessage: doc.welcomeMessage,
      goodbyeMessage: doc.goodbyeMessage,
      roleRewards: doc.roleRewards ?? [],
      modLogChannelId: doc.modLogChannelId,
      feedbackChannelId: doc.feedbackChannelId,
      adminRoleId: doc.adminRoleId,
      ticketSupportRoleId: doc.ticketSupportRoleId,
      ticketSupportRoleId2: doc.ticketSupportRoleId2,
      ticketLogChannelId: doc.ticketLogChannelId,
      welcomeEmbed: doc.welcomeEmbed,
      goodbyeEmbed: doc.goodbyeEmbed,
      ticketPanelEmbed: doc.ticketPanelEmbed,
      feedbackPanelEmbed: doc.feedbackPanelEmbed,
      ticketPanelButton: doc.ticketPanelButton,
      levelUpEmbed: doc.levelUpEmbed,
      autoMod: doc.autoMod,
      serverLog: doc.serverLog,
      leveling: doc.leveling,
      disabledCommands: doc.disabledCommands,
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
