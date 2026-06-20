import { type Model, model, Schema } from "mongoose";

/**
 * Pojedynczy dokument (_id: "bot") z heartbeatem bota. Bot nadpisuje go co kilka
 * sekund; API czyta i ocenia świeżość, by pokazać status online/offline w panelu.
 */
export type BotStatusDocument = {
  _id: string;
  username?: string;
  avatar?: string | null;
  guildCount?: number;
  /** Moment startu bota — panel liczy z niego żywy uptime. */
  startedAt?: Date;
  /** Ping gatewaya (ms) z ostatniego heartbeatu. */
  ping?: number;
  /** Wersja bota (np. „2.4.1"). */
  version?: string;
  lastHeartbeat: Date;
};

const botStatusSchema = new Schema<BotStatusDocument>(
  {
    _id: { type: String, default: "bot" },
    username: { type: String },
    avatar: { type: String, default: null },
    guildCount: { type: Number, default: 0 },
    startedAt: { type: Date },
    ping: { type: Number },
    version: { type: String },
    lastHeartbeat: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const BotStatusModel: Model<BotStatusDocument> = model<BotStatusDocument>(
  "BotStatus",
  botStatusSchema,
);
