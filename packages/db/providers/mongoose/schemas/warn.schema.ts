import { type Model, model, Schema } from "mongoose";

export type WarnDocument = {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: Date;
};

const warnSchema = new Schema<WarnDocument>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

warnSchema.index({ guildId: 1, userId: 1 });

export const WarnModel: Model<WarnDocument> = model<WarnDocument>("Warn", warnSchema);
