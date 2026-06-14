export { connectDb } from "./client";
export type { DiscordEmbed, EmbedConfig, EmbedFieldConfig } from "./embed";
export { isEmbedEmpty, toDiscordEmbed } from "./embed";
export {
  botStatusRepository,
  buttonRoleRepository,
  feedbackRepository,
  guildConfigRepository,
  modActionRepository,
  reactionRoleRepository,
  sessionRepository,
  ticketRepository,
  warnRepository,
  xpRepository,
} from "./providers/mongoose/providers";
export type {
  BotHeartbeat,
  BotStatusSnapshot,
  IBotStatusRepository,
} from "./repositories/botStatusRepository";
export type { ButtonRole, ButtonRoleEntry } from "./repositories/buttonRoleRepository";
export type {
  AddFeedbackOpts,
  Feedback,
  FeedbackCategory,
  FeedbackIdentityPatch,
  FeedbackReply,
  FeedbackStatus,
} from "./repositories/feedbackRepository";
export type {
  AutoModConfig,
  GuildConfig,
  GuildConfigPatch,
  LevelingConfig,
  ServerLogConfig,
  TicketPanelButton,
} from "./repositories/guildConfigRepository";
export type {
  AddModActionOpts,
  ModAction,
  ModActionType,
} from "./repositories/modActionRepository";
export type {
  ReactionRole,
  ReactionRoleEntry,
} from "./repositories/reactionRoleRepository";
export type { ISessionRepository } from "./repositories/sessionRepository";
export type {
  CreateTicketOpts,
  Ticket,
  TicketCounts,
  TicketStatus,
} from "./repositories/ticketRepository";
export type { AddWarnOpts, Warn } from "./repositories/warnRepository";
export type {
  AddXpResult,
  AddXpWithCooldownOpts,
  XpEntry,
} from "./repositories/xpRepository";
export {
  clampSliderXp,
  levelFromXp,
  messageXpFor,
  VOICE_XP_INTERVAL_MS,
  XP_COOLDOWN_MS,
  XP_PER_LEVEL,
  XP_PER_MESSAGE,
  XP_SAVE_DEBOUNCE_MS,
  XP_SLIDER_MAX,
  XP_SYNCALL_DELAY_MS,
  xpToNextLevel,
} from "./xpHelpers";
