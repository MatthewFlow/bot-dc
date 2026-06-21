import type {
  AddWarnOpts,
  IWarnRepository,
  Warn,
} from "../../repositories/warnRepository";
import { WarnModel } from "./schemas/warn.schema";

export class WarnProvider implements IWarnRepository {
  async add(opts: AddWarnOpts): Promise<Warn> {
    const doc = await WarnModel.create(opts);
    return {
      id: doc._id.toString(),
      guildId: doc.guildId,
      userId: doc.userId,
      moderatorId: doc.moderatorId,
      reason: doc.reason,
      createdAt: doc.createdAt,
    };
  }

  async getAll(guildId: string, userId: string): Promise<Warn[]> {
    const docs = await WarnModel.find({ guildId, userId }).sort({ createdAt: 1 }).lean();
    return docs.map((doc) => ({
      id: doc._id.toString(),
      guildId: doc.guildId,
      userId: doc.userId,
      moderatorId: doc.moderatorId,
      reason: doc.reason,
      createdAt: doc.createdAt,
    }));
  }

  async clear(guildId: string, userId: string): Promise<number> {
    const result = await WarnModel.deleteMany({ guildId, userId });
    return result.deletedCount;
  }

  async countByGuild(guildId: string): Promise<number> {
    return WarnModel.countDocuments({ guildId });
  }

  async countSince(guildId: string, since: Date): Promise<number> {
    return WarnModel.countDocuments({ guildId, createdAt: { $gte: since } });
  }

  async deleteOlderThan(guildId: string, before: Date): Promise<number> {
    const res = await WarnModel.deleteMany({ guildId, createdAt: { $lt: before } });
    return res.deletedCount;
  }
}
