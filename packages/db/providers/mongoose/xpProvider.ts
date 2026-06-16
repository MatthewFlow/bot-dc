import type {
  AddXpResult,
  AddXpWithCooldownOpts,
  IXpRepository,
  XpEntry,
} from "../../repositories/xpRepository";
import { levelFromXp } from "../../xpHelpers";
import { XpModel } from "./schemas/xp.schema";

/** MongoDB duplicate-key error (unique index violation). */
function isDuplicateKeyError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

export class XpProvider implements IXpRepository {
  async getXp(guildId: string, userId: string): Promise<number> {
    const doc = await XpModel.findOne({ guildId, userId }).lean();
    return doc?.xp ?? 0;
  }

  async addXp(guildId: string, userId: string, amount: number): Promise<AddXpResult> {
    // Single atomic upsert: the returned (new) doc gives us newXp, and oldXp is
    // simply newXp - amount — no separate read needed.
    const updated = await XpModel.findOneAndUpdate(
      { guildId, userId },
      { $inc: { xp: amount } },
      { upsert: true, new: true },
    ).lean();

    const newXp = updated?.xp ?? amount;
    return {
      gained: amount,
      oldLevel: levelFromXp(newXp - amount),
      newLevel: levelFromXp(newXp),
    };
  }

  async addXpWithCooldown(opts: AddXpWithCooldownOpts): Promise<AddXpResult> {
    const { guildId, userId, now, amount, cooldownMs } = opts;
    const threshold = now - cooldownMs;
    const skipped = { gained: 0, oldLevel: 0, newLevel: 0 };

    // 1) Conditional increment (no upsert): the cooldown lives in the filter, so
    //    the $inc only applies when enough time has passed. A match means XP was
    //    granted — the hot path is a single write with no exceptions.
    const updated = await XpModel.findOneAndUpdate(
      {
        guildId,
        userId,
        $or: [{ lastMsgAt: { $exists: false } }, { lastMsgAt: { $lte: threshold } }],
      },
      { $inc: { xp: amount }, $set: { lastMsgAt: now } },
      { new: true },
    ).lean();

    if (updated) {
      const newXp = updated.xp;
      return {
        gained: amount,
        oldLevel: levelFromXp(newXp - amount),
        newLevel: levelFromXp(newXp),
      };
    }

    // 2) No match: either the doc doesn't exist yet, or the cooldown is still
    //    active. A cheap indexed `exists` tells the two apart WITHOUT provoking a
    //    duplicate-key error per message during a burst (the old upsert did).
    if (await XpModel.exists({ guildId, userId })) return skipped;

    // 3) First message for this member → insert. A concurrent first message can
    //    still race here; the unique index rejects the loser (E11000) → no XP.
    try {
      await XpModel.create({ guildId, userId, xp: amount, lastMsgAt: now });
      return {
        gained: amount,
        oldLevel: levelFromXp(0),
        newLevel: levelFromXp(amount),
      };
    } catch (e) {
      if (isDuplicateKeyError(e)) return skipped;
      throw e;
    }
  }

  async setXp(guildId: string, userId: string, xp: number): Promise<AddXpResult> {
    const safeXp = Math.max(0, xp);

    // `new: false` returns the pre-update doc (null on insert → old xp 0), giving
    // us the old value for `gained` without a separate read.
    const before = await XpModel.findOneAndUpdate(
      { guildId, userId },
      { $set: { xp: safeXp } },
      { upsert: true, new: false },
    ).lean();

    const oldXp = before?.xp ?? 0;
    return {
      gained: safeXp - oldXp,
      oldLevel: levelFromXp(oldXp),
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
