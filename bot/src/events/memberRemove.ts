import { EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";

import { envGoodbyeChannelId } from "../config/env";
import { guildConfigRepository } from "../db/providers/mongoose/providers";
import { isAllowedTextChannel } from "../utils/channels";

export async function onMemberRemove(member: GuildMember | PartialGuildMember) {
  const cfg = await guildConfigRepository.get(member.guild.id);
  const channelId = cfg?.goodbyeChannelId ?? envGoodbyeChannelId;
  if (!channelId) return;

  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;

  const name = member.user?.username ?? "Użytkownik";

  const embed = new EmbedBuilder()
    .setTitle("Żegnamy!")
    .setDescription(`${name} wyszedł z serwera.`)
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
