import { model, Schema } from "mongoose";

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
