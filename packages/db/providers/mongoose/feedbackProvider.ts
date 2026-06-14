import type {
  AddFeedbackOpts,
  Feedback,
  FeedbackIdentityPatch,
  FeedbackReply,
  FeedbackStatus,
  IFeedbackRepository,
} from "../../repositories/feedbackRepository";
import type { FeedbackDocument } from "./schemas/feedback.schema";
import { FeedbackModel, FeedbackReadModel } from "./schemas/feedback.schema";

/**
 * Filtr „rekord o tym id, należący do tego serwera". Rekordy legacy bez `guildId`
 * dopuszczamy (panel mógł je utworzyć przed multi-tenant), więc nie zawężają serwera.
 */
function scopedFilter(id: string, guildId: string) {
  return {
    _id: id,
    $or: [{ guildId }, { guildId: null }, { guildId: { $exists: false } }],
  };
}

function toFeedback(doc: FeedbackDocument & { _id: { toString(): string } }): Feedback {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    username: doc.username,
    displayName: doc.displayName ?? null,
    avatar: doc.avatar ?? null,
    guildId: doc.guildId,
    category: doc.category,
    message: doc.message,
    rating: doc.rating,
    status: doc.status ?? "new",
    upvotedBy: doc.upvotedBy ?? [],
    replies: doc.replies ?? [],
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

  async backfillIdentity(patches: FeedbackIdentityPatch[]): Promise<void> {
    if (!patches.length) return;
    const ops = patches.flatMap((p) => {
      const set: Record<string, string> = {};
      if (p.displayName != null) set.displayName = p.displayName;
      if (p.avatar != null) set.avatar = p.avatar;
      if (p.username) set.username = p.username;
      if (!Object.keys(set).length) return [];
      return [{ updateOne: { filter: { _id: p.id }, update: { $set: set } } }];
    });
    if (!ops.length) return;
    try {
      await FeedbackModel.bulkWrite(ops, { ordered: false });
    } catch {
      // Best-effort — niepoprawny ObjectId / wyścig nie może wywrócić odczytu listy.
    }
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

  /**
   * Atomowy update scoped do serwera (jeden round-trip zamiast find+save). Zwraca
   * zaktualizowany rekord albo null (nie znaleziono / niepoprawny ObjectId).
   */
  private async updateScoped(
    id: string,
    guildId: string,
    update: Parameters<typeof FeedbackModel.findOneAndUpdate>[1],
  ): Promise<Feedback | null> {
    try {
      const doc = await FeedbackModel.findOneAndUpdate(
        scopedFilter(id, guildId),
        update,
        {
          new: true,
        },
      ).lean();
      return doc
        ? toFeedback(doc as unknown as FeedbackDocument & { _id: { toString(): string } })
        : null;
    } catch {
      return null;
    }
  }

  setStatus(
    id: string,
    guildId: string,
    status: FeedbackStatus,
  ): Promise<Feedback | null> {
    return this.updateScoped(id, guildId, { $set: { status } });
  }

  toggleUpvote(id: string, guildId: string, userId: string): Promise<Feedback | null> {
    // Pipeline-update: warunkowy toggle w jednym zapytaniu (bez wczytywania dokumentu).
    return this.updateScoped(id, guildId, [
      {
        $set: {
          upvotedBy: {
            $cond: [
              { $in: [userId, { $ifNull: ["$upvotedBy", []] }] },
              { $setDifference: [{ $ifNull: ["$upvotedBy", []] }, [userId]] },
              { $concatArrays: [{ $ifNull: ["$upvotedBy", []] }, [userId]] },
            ],
          },
        },
      },
    ]);
  }

  addReply(id: string, guildId: string, reply: FeedbackReply): Promise<Feedback | null> {
    return this.updateScoped(id, guildId, { $push: { replies: reply } });
  }
}
