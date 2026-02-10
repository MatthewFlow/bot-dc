import { EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";

import { envGoodbyeChannelId } from "../config/env";
import { getConfig } from "../config/store";
import { isAllowedTextChannel } from "../utils/channels";

export async function onMemberRemove(member: GuildMember | PartialGuildMember) {
  // guild zawsze istnieje
  const cfg = getConfig(member.guild.id);
  const channelId = cfg?.goodbyeChannelId ?? envGoodbyeChannelId;
  if (!channelId) return;

  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;

  // user może być undefined w partialu, więc bezpiecznie:
  const tag = member.user?.tag ?? "Użytkownik";

  const embed = new EmbedBuilder()
    .setTitle("Żegnamy!")
    .setDescription(`${tag} wyszedł z serwera.`)
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
