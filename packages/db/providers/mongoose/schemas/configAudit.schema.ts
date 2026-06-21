import { type Model, model, Schema } from "mongoose";

/** Wpis audytu: kto i kiedy zmienił config serwera z panelu (które pola). */
export type ConfigAuditDocument = {
  guildId: string;
  userId: string;
  username?: string;
  fields: string[];
  createdAt: Date;
};

const configAuditSchema = new Schema<ConfigAuditDocument>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    username: { type: String },
    fields: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

configAuditSchema.index({ guildId: 1, createdAt: -1 });
// TTL — wpisy audytu znikają po 90 dniach.
configAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

export const ConfigAuditModel: Model<ConfigAuditDocument> = model<ConfigAuditDocument>(
  "ConfigAudit",
  configAuditSchema,
);
