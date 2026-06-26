import { type Model, model, Schema } from "mongoose";

import type { EmbedConfig } from "../../../embed";

/** Tryb treści sticky: zwykły tekst albo embed. */
export type StickyMode = "text" | "embed";

export type StickyMessageDocument = {
  guildId: string;
  channelId: string;
  enabled: boolean;
  mode: StickyMode;
  /** Treść w trybie `text`. */
  content?: string;
  /** Treść w trybie `embed`. */
  embed?: EmbedConfig;
  /** ID ostatnio wysłanej kopii sticky (kasowana przy repostowaniu). */
  lastMessageId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

const stickyMessageSchema = new Schema<StickyMessageDocument>(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ["text", "embed"], default: "text" },
    content: { type: String },
    embed: { type: Schema.Types.Mixed, default: undefined },
    lastMessageId: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

// Jeden sticky na kanał (upsert po guildId+channelId).
stickyMessageSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

export const StickyMessageModel: Model<StickyMessageDocument> =
  model<StickyMessageDocument>("StickyMessage", stickyMessageSchema);
