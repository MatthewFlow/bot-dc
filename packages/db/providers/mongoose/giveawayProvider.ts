import type {
  CreateGiveawayOpts,
  Giveaway,
  IGiveawayRepository,
} from "../../repositories/giveawayRepository";
import { GiveawayModel } from "./schemas/giveaway.schema";

function toGiveaway(doc: InstanceType<typeof GiveawayModel>): Giveaway {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    channelId: doc.channelId,
    messageId: doc.messageId,
    prize: doc.prize,
    winnerCount: doc.winnerCount,
    endsAt: doc.endsAt,
    requiredRoleId: doc.requiredRoleId,
    hostId: doc.hostId,
    status: doc.status,
    entrants: doc.entrants,
    winners: doc.winners,
    createdAt: doc.createdAt,
    endedAt: doc.endedAt,
  };
}

export class GiveawayProvider implements IGiveawayRepository {
  async create(opts: CreateGiveawayOpts): Promise<Giveaway> {
    const doc = await GiveawayModel.create(opts);
    return toGiveaway(doc);
  }

  async get(id: string): Promise<Giveaway | null> {
    const doc = await GiveawayModel.findById(id);
    return doc ? toGiveaway(doc) : null;
  }

  async getByMessage(messageId: string): Promise<Giveaway | null> {
    const doc = await GiveawayModel.findOne({ messageId });
    return doc ? toGiveaway(doc) : null;
  }

  async getByGuild(guildId: string, limit = 50): Promise<Giveaway[]> {
    const docs = await GiveawayModel.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return docs.map(toGiveaway);
  }

  async getDueActive(now: Date, limit = 20): Promise<Giveaway[]> {
    const docs = await GiveawayModel.find({ status: "active", endsAt: { $lte: now } })
      .sort({ endsAt: 1 })
      .limit(limit);
    return docs.map(toGiveaway);
  }

  async setMessageId(id: string, messageId: string): Promise<void> {
    await GiveawayModel.updateOne({ _id: id }, { messageId });
  }

  async toggleEntry(
    id: string,
    userId: string,
  ): Promise<{ joined: boolean; count: number } | null> {
    // Tylko aktywne przyjmują wejścia; czytamy bieżący stan, by zdecydować pull/addToSet.
    const doc = await GiveawayModel.findOne({ _id: id, status: "active" });
    if (!doc) return null;
    const joined = !doc.entrants.includes(userId);
    await GiveawayModel.updateOne(
      { _id: id },
      joined ? { $addToSet: { entrants: userId } } : { $pull: { entrants: userId } },
    );
    const count = doc.entrants.length + (joined ? 1 : -1);
    return { joined, count };
  }

  async setEnded(id: string, winners: string[]): Promise<Giveaway | null> {
    const doc = await GiveawayModel.findOneAndUpdate(
      { _id: id },
      { status: "ended", winners, endedAt: new Date() },
      { new: true },
    );
    return doc ? toGiveaway(doc) : null;
  }

  async expireNow(id: string): Promise<Giveaway | null> {
    const doc = await GiveawayModel.findOneAndUpdate(
      { _id: id, status: "active" },
      { endsAt: new Date() },
      { new: true },
    );
    return doc ? toGiveaway(doc) : null;
  }

  async cancel(id: string): Promise<Giveaway | null> {
    const doc = await GiveawayModel.findOneAndUpdate(
      { _id: id },
      { status: "cancelled", endedAt: new Date() },
      { new: true },
    );
    return doc ? toGiveaway(doc) : null;
  }
}
