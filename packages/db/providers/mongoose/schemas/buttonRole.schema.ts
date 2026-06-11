import { type Model, model, Schema } from "mongoose";

import type { EmbedConfig } from "../../../embed";

export type ButtonRoleEntry = {
  label: string;
  emoji?: string;
  roleId: string;
};

export type ButtonRoleDocument = {
  guildId: string;
  channelId: string;
  messageId: string;
  embed?: EmbedConfig;
  entries: ButtonRoleEntry[];
};

const buttonRoleEntrySchema = new Schema<ButtonRoleEntry>(
  {
    label: { type: String, required: true },
    emoji: { type: String },
    roleId: { type: String, required: true },
  },
  { _id: false },
);

const buttonRoleSchema = new Schema<ButtonRoleDocument>(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String, required: true, unique: true },
    embed: { type: Schema.Types.Mixed, default: undefined },
    entries: { type: [buttonRoleEntrySchema], default: [] },
  },
  { versionKey: false },
);

buttonRoleSchema.index({ guildId: 1 });
buttonRoleSchema.index({ messageId: 1 });

export const ButtonRoleModel: Model<ButtonRoleDocument> = model<ButtonRoleDocument>(
  "ButtonRole",
  buttonRoleSchema,
);
