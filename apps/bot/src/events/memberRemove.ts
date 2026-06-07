import { guildConfigRepository, toDiscordEmbed } from "@jurassic-haven/db";
import { EmbedBuilder, type GuildMember, type PartialGuildMember } from "discord.js";

import { isAllowedTextChannel } from "../utils/channels";

const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

function goodbyeVarReplacer(
  member: GuildMember | PartialGuildMember,
): (template: string) => string {
  const username = member.user?.username ?? "Użytkownik";
  const avatar = member.user?.displayAvatarURL({ size: 256 }) ?? "";
  return (template: string) =>
    template
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{username}/g, username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{member_count}/g, String(member.guild.memberCount))
      .replace(/{avatar}/g, avatar);
}

export async function onMemberRemove(member: GuildMember | PartialGuildMember) {
  const cfg = await guildConfigRepository.get(member.guild.id);
  const channelId = cfg?.goodbyeChannelId;
  if (!channelId) return;

  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;

  if (cfg?.goodbyeEmbed) {
    const embed = toDiscordEmbed(cfg.goodbyeEmbed, goodbyeVarReplacer(member));
    await ch.send({ embeds: [embed] }).catch(() => {});
    return;
  }

  const message = goodbyeVarReplacer(member)(cfg?.goodbyeMessage ?? DEFAULT_GOODBYE);

  const embed = new EmbedBuilder()
    .setTitle("Żegnamy!")
    .setDescription(message)
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
