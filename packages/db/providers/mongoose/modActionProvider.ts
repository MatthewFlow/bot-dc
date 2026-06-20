import type {
  AddModActionOpts,
  CountSinceFilter,
  IModActionRepository,
  ModAction,
} from "../../repositories/modActionRepository";
import { ModActionModel } from "./schemas/modAction.schema";

type LeanModAction = {
  _id: { toString(): string };
  guildId: string;
  type: ModAction["type"];
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
  createdAt: Date;
};

function toModAction(doc: LeanModAction): ModAction {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    type: doc.type,
    userId: doc.userId,
    moderatorId: doc.moderatorId,
    reason: doc.reason,
    extra: doc.extra,
    createdAt: doc.createdAt,
  };
}

export class ModActionProvider implements IModActionRepository {
  async add(opts: AddModActionOpts): Promise<ModAction> {
    const doc = await ModActionModel.create(opts);
    return toModAction(doc as unknown as LeanModAction);
  }

  async getRecent(guildId: string, limit: number): Promise<ModAction[]> {
    const docs = await ModActionModel.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanModAction[]>();
    return docs.map(toModAction);
  }

  async getByUser(guildId: string, userId: string): Promise<ModAction[]> {
    const docs = await ModActionModel.find({ guildId, userId })
      .sort({ createdAt: -1 })
      .lean<LeanModAction[]>();
    return docs.map(toModAction);
  }

  async countSince(
    guildId: string,
    since: Date,
    filter: CountSinceFilter = {},
  ): Promise<number> {
    const query: Record<string, unknown> = { guildId, createdAt: { $gte: since } };
    if (filter.type) query.type = filter.type;
    if (filter.moderatorId) query.moderatorId = filter.moderatorId;
    return ModActionModel.countDocuments(query);
  }

  async latestByUsers(
    guildId: string,
    type: ModAction["type"],
    userIds: string[],
  ): Promise<Map<string, ModAction>> {
    const map = new Map<string, ModAction>();
    if (userIds.length === 0) return map;

    const docs = await ModActionModel.find({ guildId, type, userId: { $in: userIds } })
      .sort({ createdAt: -1 })
      .lean<LeanModAction[]>();

    // Posortowane malejąco po dacie — pierwszy wpis per userId jest najświeższy.
    for (const doc of docs) {
      if (!map.has(doc.userId)) map.set(doc.userId, toModAction(doc));
    }
    return map;
  }
}
