import type { IActivityEventRepository } from "../../repositories/activityEventRepository";
import type { IBotJobRepository } from "../../repositories/botJobRepository";
import type { IBotStatusRepository } from "../../repositories/botStatusRepository";
import type { IButtonRoleRepository } from "../../repositories/buttonRoleRepository";
import type { IConfigAuditRepository } from "../../repositories/configAuditRepository";
import type { IFeedbackRepository } from "../../repositories/feedbackRepository";
import type { IGameServerStatusRepository } from "../../repositories/gameServerStatusRepository";
import type { IGiveawayRepository } from "../../repositories/giveawayRepository";
import type { IGuildConfigRepository } from "../../repositories/guildConfigRepository";
import type { IModActionRepository } from "../../repositories/modActionRepository";
import type { IReactionRoleRepository } from "../../repositories/reactionRoleRepository";
import type { ISessionRepository } from "../../repositories/sessionRepository";
import type { IStickyMessageRepository } from "../../repositories/stickyMessageRepository";
import type { ITempVoiceChannelRepository } from "../../repositories/tempVoiceChannelRepository";
import type { ITicketRepository } from "../../repositories/ticketRepository";
import type { IUserPreferencesRepository } from "../../repositories/userPreferencesRepository";
import type { IWarnRepository } from "../../repositories/warnRepository";
import type { IXpRepository } from "../../repositories/xpRepository";
import { ActivityEventProvider } from "./activityEventProvider";
import { BotJobProvider } from "./botJobProvider";
import { BotStatusProvider } from "./botStatusProvider";
import { ButtonRoleProvider } from "./buttonRoleProvider";
import { ConfigAuditProvider } from "./configAuditProvider";
import { FeedbackProvider } from "./feedbackProvider";
import { GameServerStatusProvider } from "./gameServerStatusProvider";
import { GiveawayProvider } from "./giveawayProvider";
import { GuildConfigProvider } from "./guildConfigProvider";
import { ModActionProvider } from "./modActionProvider";
import { ReactionRoleProvider } from "./reactionRoleProvider";
import { SessionProvider } from "./sessionProvider";
import { StickyMessageProvider } from "./stickyMessageProvider";
import { TempVoiceChannelProvider } from "./tempVoiceChannelProvider";
import { TicketProvider } from "./ticketProvider";
import { UserPreferencesProvider } from "./userPreferencesProvider";
import { WarnProvider } from "./warnProvider";
import { XpProvider } from "./xpProvider";

export const guildConfigRepository: IGuildConfigRepository = new GuildConfigProvider();
export const xpRepository: IXpRepository = new XpProvider();
export const reactionRoleRepository: IReactionRoleRepository = new ReactionRoleProvider();
export const buttonRoleRepository: IButtonRoleRepository = new ButtonRoleProvider();
export const warnRepository: IWarnRepository = new WarnProvider();
export const ticketRepository: ITicketRepository = new TicketProvider();
export const modActionRepository: IModActionRepository = new ModActionProvider();
export const sessionRepository: ISessionRepository = new SessionProvider();
export const feedbackRepository: IFeedbackRepository = new FeedbackProvider();
export const botStatusRepository: IBotStatusRepository = new BotStatusProvider();
export const activityEventRepository: IActivityEventRepository =
  new ActivityEventProvider();
export const configAuditRepository: IConfigAuditRepository = new ConfigAuditProvider();
export const botJobRepository: IBotJobRepository = new BotJobProvider();
export const gameServerStatusRepository: IGameServerStatusRepository =
  new GameServerStatusProvider();
export const giveawayRepository: IGiveawayRepository = new GiveawayProvider();
export const stickyMessageRepository: IStickyMessageRepository =
  new StickyMessageProvider();
export const tempVoiceChannelRepository: ITempVoiceChannelRepository =
  new TempVoiceChannelProvider();
export const userPreferencesRepository: IUserPreferencesRepository =
  new UserPreferencesProvider();
