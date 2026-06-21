import type {
  BotJob,
  CreateBotJobOpts,
  IBotJobRepository,
} from "../../repositories/botJobRepository";
import { type BotJobDocument, BotJobModel } from "./schemas/botJob.schema";

type LeanBotJob = BotJobDocument & { _id: { toString(): string } };

function toJob(doc: LeanBotJob): BotJob {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    type: doc.type,
    runAt: doc.runAt,
    recurrence: doc.recurrence,
    status: doc.status,
    channelId: doc.channelId,
    embed: doc.embed,
    lastError: doc.lastError,
    lastRunAt: doc.lastRunAt,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
  };
}

export class BotJobProvider implements IBotJobRepository {
  async create(opts: CreateBotJobOpts): Promise<BotJob> {
    const doc = await BotJobModel.create(opts);
    return toJob(doc as unknown as LeanBotJob);
  }

  async getActiveByGuild(guildId: string, limit: number): Promise<BotJob[]> {
    const docs = await BotJobModel.find({ guildId, status: "pending" })
      .sort({ runAt: 1 })
      .limit(limit)
      .lean<LeanBotJob[]>();
    return docs.map(toJob);
  }

  async getDue(now: Date, limit: number): Promise<BotJob[]> {
    const docs = await BotJobModel.find({ status: "pending", runAt: { $lte: now } })
      .sort({ runAt: 1 })
      .limit(limit)
      .lean<LeanBotJob[]>();
    return docs.map(toJob);
  }

  async markDone(id: string): Promise<void> {
    await BotJobModel.updateOne({ _id: id }, { status: "done", lastRunAt: new Date() });
  }

  async markError(id: string, error: string): Promise<void> {
    await BotJobModel.updateOne(
      { _id: id },
      { status: "error", lastError: error.slice(0, 500), lastRunAt: new Date() },
    );
  }

  async reschedule(id: string, nextRunAt: Date, lastRunAt: Date): Promise<void> {
    await BotJobModel.updateOne({ _id: id }, { runAt: nextRunAt, lastRunAt });
  }

  async delete(id: string, guildId: string): Promise<boolean> {
    const res = await BotJobModel.deleteOne({ _id: id, guildId });
    return res.deletedCount > 0;
  }
}
