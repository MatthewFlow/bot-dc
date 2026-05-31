import { model, Schema } from "mongoose";

export type RoleReward = {
  level: number;
  roleId: string;
};

export type GuildConfigDocument = {
  guildId: string;
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  joinRoleId?: string;
  verifiedRoleId?: string;
  welcomeMessage?: string;
  goodbyeMessage?: string;
  roleRewards: RoleReward[];
};

const roleRewardSchema = new Schema<RoleReward>(
  {
    level: { type: Number, required: true, min: 1 },
    roleId: { type: String, required: true },
  },
  { _id: false },
);

const guildConfigSchema = new Schema<GuildConfigDocument>(
  {
    guildId: { type: String, required: true, unique: true },
    welcomeChannelId: { type: String },
    goodbyeChannelId: { type: String },
    levelUpChannelId: { type: String },
    joinRoleId: { type: String },
    verifiedRoleId: { type: String },
    welcomeMessage: { type: String },
    goodbyeMessage: { type: String },
    roleRewards: { type: [roleRewardSchema], default: [] },
  },
  { versionKey: false },
);

export const GuildConfigModel = model<GuildConfigDocument>(
  "GuildConfig",
  guildConfigSchema,
);
