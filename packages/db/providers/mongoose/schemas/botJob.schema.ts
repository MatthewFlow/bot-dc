import { type Model, model, Schema } from "mongoose";

import type { EmbedConfig } from "../../../embed";

/** Typ zadania w kolejce bot↔panel (rozszerzalny). */
export type BotJobType = "sendEmbed" | "unban" | "gameAnnounce";
export type JobRecurrence = "once" | "daily" | "weekly";
export type JobStatus = "pending" | "done" | "error" | "cancelled";

export type BotJobDocument = {
  guildId: string;
  type: BotJobType;
  /** Kiedy zadanie ma się wykonać. */
  runAt: Date;
  recurrence: JobRecurrence;
  status: JobStatus;
  /** Payload `sendEmbed`. */
  channelId?: string;
  embed?: EmbedConfig;
  /** Payload `unban` — kogo odbanować (temp-ban). */
  userId?: string;
  /** Payload `gameAnnounce` — treść ogłoszenia in-game (RCON). */
  text?: string;
  lastError?: string;
  lastRunAt?: Date;
  createdBy: string;
  createdAt: Date;
};

const botJobSchema = new Schema<BotJobDocument>(
  {
    guildId: { type: String, required: true },
    type: {
      type: String,
      enum: ["sendEmbed", "unban", "gameAnnounce"],
      required: true,
    },
    runAt: { type: Date, required: true },
    recurrence: {
      type: String,
      enum: ["once", "daily", "weekly"],
      default: "once",
    },
    status: {
      type: String,
      enum: ["pending", "done", "error", "cancelled"],
      default: "pending",
    },
    channelId: { type: String },
    embed: { type: Schema.Types.Mixed, default: undefined },
    userId: { type: String },
    text: { type: String },
    lastError: { type: String },
    lastRunAt: { type: Date },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

// Worker pobiera zaległe: status pending + runAt w przeszłości.
botJobSchema.index({ status: 1, runAt: 1 });
botJobSchema.index({ guildId: 1, createdAt: -1 });

export const BotJobModel: Model<BotJobDocument> = model<BotJobDocument>(
  "BotJob",
  botJobSchema,
);
