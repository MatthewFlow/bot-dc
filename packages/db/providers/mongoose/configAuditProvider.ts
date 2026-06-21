import type {
  AddConfigAuditOpts,
  ConfigAuditEntry,
  IConfigAuditRepository,
} from "../../repositories/configAuditRepository";
import { ConfigAuditModel } from "./schemas/configAudit.schema";

type LeanConfigAudit = {
  _id: { toString(): string };
  guildId: string;
  userId: string;
  username?: string;
  fields: string[];
  createdAt: Date;
};

function toEntry(doc: LeanConfigAudit): ConfigAuditEntry {
  return {
    id: doc._id.toString(),
    guildId: doc.guildId,
    userId: doc.userId,
    username: doc.username,
    fields: doc.fields ?? [],
    createdAt: doc.createdAt,
  };
}

export class ConfigAuditProvider implements IConfigAuditRepository {
  async add(opts: AddConfigAuditOpts): Promise<void> {
    await ConfigAuditModel.create(opts);
  }

  async getRecent(guildId: string, limit: number): Promise<ConfigAuditEntry[]> {
    const docs = await ConfigAuditModel.find({ guildId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<LeanConfigAudit[]>();
    return docs.map(toEntry);
  }
}
