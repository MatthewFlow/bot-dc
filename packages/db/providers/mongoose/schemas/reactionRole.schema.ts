import { model, Schema } from "mongoose";

import type { EmbedConfig } from "../../../embed";

export type ReactionRoleEntry = {
  emoji: string;
  roleId: string;
};

export type ReactionRoleDocument = {
  guildId: string;
  channelId: string;
  messageId: string;
  title: string;
  content: string;
  color?: string;
  /** Pełna konfiguracja embeda (gdy użyto edytora); title/content/color to skrót do listy. */
  embed?: EmbedConfig;
  entries: ReactionRoleEntry[];
};

const reactionRoleEntrySchema = new Schema<ReactionRoleEntry>(
  {
    emoji: { type: String, required: true },
    roleId: { type: String, required: true },
  },
  { _id: false },
);

const reactionRoleSchema = new Schema<ReactionRoleDocument>(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    color: { type: String },
    embed: { type: Schema.Types.Mixed, default: undefined },
    entries: { type: [reactionRoleEntrySchema], default: [] },
  },
  { versionKey: false },
);

reactionRoleSchema.index({ guildId: 1 });
reactionRoleSchema.index({ messageId: 1 });

export const ReactionRoleModel = model<ReactionRoleDocument>(
  "ReactionRole",
  reactionRoleSchema,
);
