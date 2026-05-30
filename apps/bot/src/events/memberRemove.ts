import { guildConfigRepository } from "@jurassic-haven/db";
import { EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";

import { envGoodbyeChannelId } from "../config/env";
import { isAllowedTextChannel } from "../utils/channels";

const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

function resolveMessage(
  template: string,
  member: GuildMember | PartialGuildMember,
): string {
  const username = member.user?.username ?? "Użytkownik";
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{member_count}/g, String(member.guild.memberCount));
}

export async function onMemberRemove(member: GuildMember | PartialGuildMember) {
  const cfg = await guildConfigRepository.get(member.guild.id);
  const channelId = cfg?.goodbyeChannelId ?? envGoodbyeChannelId;
  if (!channelId) return;

  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;

  const message = resolveMessage(cfg?.goodbyeMessage ?? DEFAULT_GOODBYE, member);

  const embed = new EmbedBuilder()
    .setTitle("Żegnamy!")
    .setDescription(message)
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
