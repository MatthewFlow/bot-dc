import { GuildConfigProvider } from "./guildConfigProvider";
import { ReactionRoleProvider } from "./reactionRoleProvider";
import { XpProvider } from "./xpProvider";

export const guildConfigRepository = new GuildConfigProvider();
export const xpRepository = new XpProvider();
export const reactionRoleRepository = new ReactionRoleProvider();
