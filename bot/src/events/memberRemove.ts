import { EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";
 
import { envGoodbyeChannelId } from "../config/env";
import { getConfig } from "../config/guildConfig";
import { isAllowedTextChannel } from "../utils/channels";
 
export async function onMemberRemove(member: GuildMember | PartialGuildMember) {
  const cfg = getConfig(member.guild.id);
  const channelId = cfg?.goodbyeChannelId ?? envGoodbyeChannelId;
  if (!channelId) return;
 
  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;
 
  // .tag jest deprecated w Discord.js v14 — używamy .username
  const name = member.user?.username ?? "Użytkownik";
 
  const embed = new EmbedBuilder()
    .setTitle("Żegnamy!")
    .setDescription(`${name} wyszedł z serwera.`)
    .setTimestamp();
 
  await ch.send({ embeds: [embed] }).catch(() => {});
}