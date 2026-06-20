import { type Model, model, Schema } from "mongoose";

/** Zdarzenia aktywności poza moderacją (feed na dashboardzie). */
export type ActivityEventType = "levelup" | "role";

export type ActivityEventDocument = {
  guildId: string;
  type: ActivityEventType;
  userId: string;
  /** Dla `levelup` — osiągnięty poziom. */
  level?: number;
  /** Dla `role` — nadana rola (id + nazwa w momencie nadania). */
  roleId?: string;
  roleName?: string;
  createdAt: Date;
};

const activityEventSchema = new Schema<ActivityEventDocument>(
  {
    guildId: { type: String, required: true },
    type: { type: String, enum: ["levelup", "role"], required: true },
    userId: { type: String, required: true },
    level: { type: Number },
    roleId: { type: String },
    roleName: { type: String },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

activityEventSchema.index({ guildId: 1, createdAt: -1 });
// TTL — wpisy aktywności znikają po 30 dniach (feed pokazuje tylko świeże zdarzenia).
activityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2_592_000 });

export const ActivityEventModel: Model<ActivityEventDocument> =
  model<ActivityEventDocument>("ActivityEvent", activityEventSchema);
