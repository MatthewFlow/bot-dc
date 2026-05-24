import { model, Schema } from "mongoose";

export type XpDocument = {
  guildId: string;
  userId: string;
  xp: number;
  lastMsgAt?: number;
};

const xpSchema = new Schema<XpDocument>(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, required: true, default: 0, min: 0 },
    lastMsgAt: { type: Number },
  },
  { versionKey: false },
);

xpSchema.index({ guildId: 1, userId: 1 }, { unique: true });
xpSchema.index({ guildId: 1, xp: -1 });

export const XpModel = model<XpDocument>("Xp", xpSchema);
