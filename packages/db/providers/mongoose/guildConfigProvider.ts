import type {
  GuildConfig,
  GuildConfigPatch,
  IGuildConfigRepository,
} from "../../repositories/guildConfigRepository";
import { GuildConfigModel } from "./schemas/guildConfig.schema";

// Zagnieżdżone obiekty configu, które chcemy SCALAĆ polami (a nie nadpisywać w
// całości). Spłaszczamy je do dot-notation, więc częściowy patch (np. samo
// `leveling.messageXp`) nie wymaże pozostałych pól poddokumentu.
const MERGED_NESTED = new Set(["autoMod", "serverLog", "leveling"]);

/** Buduje payload `$set`: zagnieżdżone obiekty z {@link MERGED_NESTED} idą dot-notation. */
function buildSet(patch: GuildConfigPatch): Record<string, unknown> {
  const $set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (
      MERGED_NESTED.has(key) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const [nk, nv] of Object.entries(value)) $set[`${key}.${nk}`] = nv;
    } else {
      // Skalary, tablice, embedy oraz jawne `null` (czyszczenie pola) — wprost.
      $set[key] = value;
    }
  }
  return $set;
}

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
      { $set: buildSet(patch) },
      { upsert: true, new: true },
    );
  }
}
