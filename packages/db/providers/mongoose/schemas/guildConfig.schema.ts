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

/** Konfiguracja logów serwera (kanał + przełączniki kategorii). Brak obiektu = wyłączone. */
export type ServerLogConfig = {
  enabled: boolean;
  channelId?: string;
  messageDelete: boolean;
  messageEdit: boolean;
  memberJoin: boolean;
  memberLeave: boolean;
  roleChanges: boolean;
  nicknameChanges: boolean;
};

export type AutoModAction = "delete" | "warn" | "mute";

/** Konfiguracja auto-moderacji (filtry + akcja). Brak obiektu = wyłączone. */
export type AutoModConfig = {
  enabled: boolean;
  blockInvites: boolean;
  blockLinks: boolean;
  bannedWords: string[];
  spamEnabled: boolean;
  spamMaxMessages: number;
  spamWindowSeconds: number;
  exemptRoleIds: string[];
  exemptChannelIds: string[];
  action: AutoModAction;
  muteDurationSeconds: number;
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
  autoMod?: AutoModConfig;
  serverLog?: ServerLogConfig;
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

const autoModSchema = new Schema<AutoModConfig>(
  {
    enabled: { type: Boolean, default: false },
    blockInvites: { type: Boolean, default: false },
    blockLinks: { type: Boolean, default: false },
    bannedWords: { type: [String], default: [] },
    spamEnabled: { type: Boolean, default: false },
    spamMaxMessages: { type: Number, default: 5 },
    spamWindowSeconds: { type: Number, default: 5 },
    exemptRoleIds: { type: [String], default: [] },
    exemptChannelIds: { type: [String], default: [] },
    action: { type: String, enum: ["delete", "warn", "mute"], default: "delete" },
    muteDurationSeconds: { type: Number, default: 300 },
  },
  { _id: false },
);

const serverLogSchema = new Schema<ServerLogConfig>(
  {
    enabled: { type: Boolean, default: false },
    channelId: { type: String },
    messageDelete: { type: Boolean, default: true },
    messageEdit: { type: Boolean, default: true },
    memberJoin: { type: Boolean, default: true },
    memberLeave: { type: Boolean, default: true },
    roleChanges: { type: Boolean, default: true },
    nicknameChanges: { type: Boolean, default: true },
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
    autoMod: { type: autoModSchema, default: undefined },
    serverLog: { type: serverLogSchema, default: undefined },
  },
  { versionKey: false },
);

export const GuildConfigModel = model<GuildConfigDocument>(
  "GuildConfig",
  guildConfigSchema,
);
