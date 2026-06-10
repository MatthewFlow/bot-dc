import { reactionRoleRepository } from "@jurassic-haven/db";
import type {
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
} from "discord.js";

import { isReactionRoleMessage } from "../utils/reactionRoleCache";

export async function onMessageReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const guildId = reaction.message.guildId;
  if (!guildId) return;

  // Cache-gated: ordinary reactions never reach the DB — only panel messages do.
  if (!(await isReactionRoleMessage(guildId, reaction.message.id))) return;

  const config = await reactionRoleRepository.getByMessageId(reaction.message.id);
  if (!config) return;

  const emoji = reaction.emoji.id
    ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
    : (reaction.emoji.name ?? "");

  const entry = config.entries.find((e) => e.emoji === emoji);
  if (!entry) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.remove(entry.roleId).catch((e) => {
    console.error(`[reactionRemove] Nie udało się odebrać roli ${entry.roleId}:`, e);
  });
}
