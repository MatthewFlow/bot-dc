import { EmbedBuilder, type GuildMember } from "discord.js";

import { envWelcomeChannelId } from "../config/env";
import { levelFromXp } from "../config/xpHelpers";
import { guildConfigRepository, xpRepository } from "../db/providers/mongoose/providers";
import { applyAutoRole } from "../levels/autorole";
import { isAllowedTextChannel } from "../utils/channels";

export async function onMemberAdd(member: GuildMember) {
  const xp = await xpRepository.getXp(member.guild.id, member.id);
  const level = levelFromXp(xp);

  await applyAutoRole(member, level).catch(() => {});

  const cfg = await guildConfigRepository.get(member.guild.id);
  const channelId = cfg?.welcomeChannelId ?? envWelcomeChannelId;
  if (!channelId) return;

  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;

  const embed = new EmbedBuilder()
    .setTitle("Witamy!")
    .setDescription(`Siema ${member}, miło że jesteś 😄`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
