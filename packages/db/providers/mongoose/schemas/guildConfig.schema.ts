import { model, Schema } from "mongoose";

import type { EmbedConfig } from "../../../embed";

export type RoleReward = {
  level: number;
  roleId: string;
};

/** Personalizacja przycisku pod embedem panelu ticketów. */
export type TicketPanelButton = {
  label?: string;
  emoji?: string;
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
  modLogChannelId?: string;
  adminRoleId?: string;
  ticketSupportRoleId?: string;
  ticketSupportRoleId2?: string;
  ticketLogChannelId?: string;
  welcomeEmbed?: EmbedConfig;
  goodbyeEmbed?: EmbedConfig;
  ticketPanelEmbed?: EmbedConfig;
  ticketPanelButton?: TicketPanelButton;
};

const roleRewardSchema = new Schema<RoleReward>(
  {
    level: { type: Number, required: true, min: 1 },
    roleId: { type: String, required: true },
  },
  { _id: false },
);

const embedFieldSchema = new Schema(
  {
    name: { type: String },
    value: { type: String },
    inline: { type: Boolean },
  },
  { _id: false },
);

const embedSchema = new Schema<EmbedConfig>(
  {
    title: { type: String },
    description: { type: String },
    color: { type: Number },
    url: { type: String },
    authorName: { type: String },
    authorIconUrl: { type: String },
    thumbnailUrl: { type: String },
    imageUrl: { type: String },
    footerText: { type: String },
    footerIconUrl: { type: String },
    timestamp: { type: Boolean },
    fields: { type: [embedFieldSchema], default: undefined },
  },
  { _id: false },
);

const ticketPanelButtonSchema = new Schema<TicketPanelButton>(
  {
    label: { type: String },
    emoji: { type: String },
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
    modLogChannelId: { type: String },
    adminRoleId: { type: String },
    ticketSupportRoleId: { type: String },
    ticketSupportRoleId2: { type: String },
    ticketLogChannelId: { type: String },
    welcomeEmbed: { type: embedSchema, default: undefined },
    goodbyeEmbed: { type: embedSchema, default: undefined },
    ticketPanelEmbed: { type: embedSchema, default: undefined },
    ticketPanelButton: { type: ticketPanelButtonSchema, default: undefined },
  },
  { versionKey: false },
);

export const GuildConfigModel = model<GuildConfigDocument>(
  "GuildConfig",
  guildConfigSchema,
);
