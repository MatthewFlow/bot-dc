import type {
  AddFeedbackOpts,
  Feedback,
  IFeedbackRepository,
} from "../../repositories/feedbackRepository";
import type { FeedbackDocument } from "./schemas/feedback.schema";
import { FeedbackModel } from "./schemas/feedback.schema";

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
}
