import type {
  ActivityEvent,
  AddActivityEventOpts,
  IActivityEventRepository,
} from "../../repositories/activityEventRepository";
import { ActivityEventModel } from "./schemas/activityEvent.schema";

type LeanActivityEvent = {
  _id: { toString(): string };
  guildId: string;
  type: ActivityEvent["type"];
  userId: string;
  level?: number;
  roleId?: string;
  roleName?: string;
  createdAt: Date;
};

function toEvent(doc: LeanActivityEvent): ActivityEvent {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    type: doc.type,
    userId: doc.userId,
    level: doc.level,
    roleId: doc.roleId,
    roleName: doc.roleName,
    createdAt: doc.createdAt,
  };
}

export class ActivityEventProvider implements IActivityEventRepository {
  async add(opts: AddActivityEventOpts): Promise<void> {
    await ActivityEventModel.create(opts);
  }

  async getRecent(guildId: string, limit: number): Promise<ActivityEvent[]> {
    const docs = await ActivityEventModel.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanActivityEvent[]>();
    return docs.map(toEvent);
  }
}
