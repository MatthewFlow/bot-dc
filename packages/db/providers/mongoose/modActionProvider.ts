import type {
  AddModActionOpts,
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
}
