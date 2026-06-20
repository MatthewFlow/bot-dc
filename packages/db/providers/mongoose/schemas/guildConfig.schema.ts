import { type Model, model, Schema } from "mongoose";

// Współdzielone typy konfiguracji żyją w czystym `../../../types` (bez mongoose),
// żeby panel mógł je importować bez wciągania runtime'u. Re-eksportujemy je tu,
// bo część importerów sięga po nie z poziomu schematu.
import type {
  AutoModConfig,
  EmbedConfig,
  LevelingConfig,
  RoleReward,
  ServerLogConfig,
  TicketPanelButton,
} from "../../../types";

export type {
  AutoModAction,
  AutoModConfig,
  LevelingConfig,
  RoleReward,
  ServerLogConfig,
  TicketPanelButton,
} from "../../../types";

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
  /** Czy bot wysyła karanemu użytkownikowi DM z informacją o nałożonej karze. */
  dmOnPunish?: boolean;
  /** Auto-ban po osiągnięciu tylu ostrzeżeń (`0`/brak = wyłączone). */
  autoBanThreshold?: number;
  feedbackChannelId?: string;
  adminRoleId?: string;
  ticketSupportRoleId?: string;
  ticketSupportRoleId2?: string;
  ticketLogChannelId?: string;
  welcomeEmbed?: EmbedConfig;
  goodbyeEmbed?: EmbedConfig;
  ticketPanelEmbed?: EmbedConfig;
  feedbackPanelEmbed?: EmbedConfig;
  ticketPanelButton?: TicketPanelButton;
  levelUpEmbed?: EmbedConfig;
  autoMod?: AutoModConfig;
  serverLog?: ServerLogConfig;
  leveling?: LevelingConfig;
  /** Nazwy komend wyłączonych na tym serwerze (egzekwowane w runtime przez bota). */
  disabledCommands?: string[];
  /** Prefiks komend klasycznych (np. `!`). Slash-komendy działają niezależnie. */
  prefix?: string;
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

const levelingSchema = new Schema<LevelingConfig>(
  {
    messageXp: { type: Number },
    voiceXp: { type: Number },
    xpMultiplier: { type: Number },
    noXpChannelIds: { type: [String], default: [] },
    noXpRoleIds: { type: [String], default: [] },
    levelUpEnabled: { type: Boolean, default: true },
    levelUpDm: { type: Boolean, default: false },
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
    exemptRoleIds: { type: [String], default: [] },
    exemptChannelIds: { type: [String], default: [] },
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
    dmOnPunish: { type: Boolean, default: undefined },
    autoBanThreshold: { type: Number, default: undefined },
    feedbackChannelId: { type: String },
    adminRoleId: { type: String },
    ticketSupportRoleId: { type: String },
    ticketSupportRoleId2: { type: String },
    ticketLogChannelId: { type: String },
    welcomeEmbed: { type: embedSchema, default: undefined },
    goodbyeEmbed: { type: embedSchema, default: undefined },
    ticketPanelEmbed: { type: embedSchema, default: undefined },
    feedbackPanelEmbed: { type: embedSchema, default: undefined },
    ticketPanelButton: { type: ticketPanelButtonSchema, default: undefined },
    levelUpEmbed: { type: embedSchema, default: undefined },
    autoMod: { type: autoModSchema, default: undefined },
    serverLog: { type: serverLogSchema, default: undefined },
    leveling: { type: levelingSchema, default: undefined },
    disabledCommands: { type: [String], default: undefined },
    prefix: { type: String, default: undefined },
  },
  { versionKey: false },
);

export const GuildConfigModel: Model<GuildConfigDocument> = model<GuildConfigDocument>(
  "GuildConfig",
  guildConfigSchema,
);
