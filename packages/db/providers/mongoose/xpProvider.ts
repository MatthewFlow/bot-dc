import type {
  AddXpResult,
  AddXpWithCooldownOpts,
  IXpRepository,
  XpEntry,
} from "../../repositories/xpRepository";
import { levelFromXp } from "../../xpHelpers";
import { XpModel } from "./schemas/xp.schema";

export class XpProvider implements IXpRepository {
  async getXp(guildId: string, userId: string): Promise<number> {
    const doc = await XpModel.findOne({ guildId, userId }).lean();
    return doc?.xp ?? 0;
  }

  async addXp(guildId: string, userId: string, amount: number): Promise<AddXpResult> {
    const before = await XpModel.findOne({ guildId, userId }).lean();
    const oldXp = before?.xp ?? 0;
    const oldLevel = levelFromXp(oldXp);

    const updated = await XpModel.findOneAndUpdate(
      { guildId, userId },
      { $inc: { xp: amount } },
      { upsert: true, new: true },
    ).lean();

    const newLevel = levelFromXp(updated?.xp ?? oldXp + amount);

    return { gained: amount, oldLevel, newLevel };
  }

  async addXpWithCooldown(opts: AddXpWithCooldownOpts): Promise<AddXpResult> {
    const { guildId, userId, now, amount, cooldownMs } = opts;

    const doc = await XpModel.findOne({ guildId, userId }).lean();
    const currentXp = doc?.xp ?? 0;
    const lastMsgAt = doc?.lastMsgAt ?? 0;
    const currentLevel = levelFromXp(currentXp);

    if (now - lastMsgAt < cooldownMs) {
      return { gained: 0, oldLevel: currentLevel, newLevel: currentLevel };
    }

    const oldLevel = levelFromXp(currentXp);

    const updated = await XpModel.findOneAndUpdate(
      { guildId, userId },
      { $inc: { xp: amount }, $set: { lastMsgAt: now } },
      { upsert: true, new: true },
    ).lean();

    const newLevel = levelFromXp(updated?.xp ?? currentXp + amount);

    return { gained: amount, oldLevel, newLevel };
  }

  async setXp(guildId: string, userId: string, xp: number): Promise<AddXpResult> {
    const before = await XpModel.findOne({ guildId, userId }).lean();
    const oldLevel = levelFromXp(before?.xp ?? 0);

    const safeXp = Math.max(0, xp);

    await XpModel.findOneAndUpdate(
      { guildId, userId },
      { $set: { xp: safeXp } },
      { upsert: true },
    );

    return {
      gained: safeXp - (before?.xp ?? 0),
      oldLevel,
      newLevel: levelFromXp(safeXp),
    };
  }

  async getLeaderboard(guildId: string, limit: number): Promise<XpEntry[]> {
    const docs = await XpModel.find({ guildId }).sort({ xp: -1 }).limit(limit).lean();

    return docs.map((d) => ({
      guildId: d.guildId,
      userId: d.userId,
      xp: d.xp,
      lastMsgAt: d.lastMsgAt,
    }));
  }
}
