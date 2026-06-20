import { type Model, model, Schema } from "mongoose";

export type ModActionType =
  | "warn"
  | "mute"
  | "unmute"
  | "kick"
  | "ban"
  | "unban"
  | "clearwarns";

export type ModActionDocument = {
  guildId: string;
  type: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
  createdAt: Date;
};

const modActionSchema = new Schema<ModActionDocument>(
  {
    guildId: { type: String, required: true },
    type: {
      type: String,
      enum: ["warn", "mute", "unmute", "kick", "ban", "unban", "clearwarns"],
      required: true,
    },
    userId: { type: String, required: true },
    moderatorId: { type: String, required: true },
    reason: { type: String, required: true },
    extra: { type: String },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

modActionSchema.index({ guildId: 1, createdAt: -1 });
modActionSchema.index({ guildId: 1, userId: 1 });

export const ModActionModel: Model<ModActionDocument> = model<ModActionDocument>(
  "ModAction",
  modActionSchema,
);
