import type {
  AddFeedbackOpts,
  Feedback,
  IFeedbackRepository,
} from "../../repositories/feedbackRepository";
import type { FeedbackDocument } from "./schemas/feedback.schema";
import { FeedbackModel, FeedbackReadModel } from "./schemas/feedback.schema";

function toFeedback(doc: FeedbackDocument & { _id: { toString(): string } }): Feedback {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    username: doc.username,
    guildId: doc.guildId,
    category: doc.category,
    message: doc.message,
    rating: doc.rating,
    createdAt: doc.createdAt,
  };
}

export class FeedbackProvider implements IFeedbackRepository {
  async add(opts: AddFeedbackOpts): Promise<Feedback> {
    const doc = await FeedbackModel.create(opts);
    return toFeedback(doc);
  }

  async getByUser(userId: string): Promise<Feedback[]> {
    const docs = await FeedbackModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d) =>
      toFeedback(d as unknown as FeedbackDocument & { _id: { toString(): string } }),
    );
  }

  async getByGuild(guildId: string, limit = 50): Promise<Feedback[]> {
    const docs = await FeedbackModel.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((d) =>
      toFeedback(d as unknown as FeedbackDocument & { _id: { toString(): string } }),
    );
  }

  async countByGuildSince(guildId: string, since: Date | null): Promise<number> {
    const filter = since ? { guildId, createdAt: { $gt: since } } : { guildId };
    return FeedbackModel.countDocuments(filter);
  }

  async getSeenAt(userId: string, guildId: string): Promise<Date | null> {
    const doc = await FeedbackReadModel.findOne({ userId, guildId }).lean();
    return doc?.seenAt ?? null;
  }

  async markSeen(userId: string, guildId: string, at: Date): Promise<void> {
    await FeedbackReadModel.updateOne(
      { userId, guildId },
      { $set: { seenAt: at } },
      { upsert: true },
    );
  }

  async delete(id: string, guildId: string): Promise<boolean> {
    try {
      const doc = await FeedbackModel.findById(id);
      if (!doc) return false;
      // Nowe zgłoszenia muszą należeć do tego serwera (ochrona przed kasowaniem
      // cudzego serwera). Legacy bez guildId dopuszczamy do usunięcia z panelu.
      if (doc.guildId && doc.guildId !== guildId) return false;
      await doc.deleteOne();
      return true;
    } catch {
      // Niepoprawny ObjectId itp.
      return false;
    }
  }
}
