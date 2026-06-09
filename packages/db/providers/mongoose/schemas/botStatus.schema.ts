import { model, Schema } from "mongoose";

/**
 * Pojedynczy dokument (_id: "bot") z heartbeatem bota. Bot nadpisuje go co kilka
 * sekund; API czyta i ocenia świeżość, by pokazać status online/offline w panelu.
 */
export type BotStatusDocument = {
  _id: string;
  username?: string;
  avatar?: string | null;
  guildCount?: number;
  lastHeartbeat: Date;
};

const botStatusSchema = new Schema<BotStatusDocument>(
  {
    _id: { type: String, default: "bot" },
    username: { type: String },
    avatar: { type: String, default: null },
    guildCount: { type: Number, default: 0 },
    lastHeartbeat: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const BotStatusModel = model<BotStatusDocument>("BotStatus", botStatusSchema);
