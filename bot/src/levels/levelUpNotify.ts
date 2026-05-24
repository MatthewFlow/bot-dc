import { EmbedBuilder, type GuildMember } from "discord.js";

import { getConfig } from "../config/guildConfig";

export async function notifyLevelUp(
  member: GuildMember,
  level: number,
  roleMention?: string,
) {
  const cfg = getConfig(member.guild.id);
  // config ma pierwszeństwo, fallback na .env
  const channelId = cfg?.levelUpChannelId ?? process.env.LEVEL_UP_CHANNEL_ID;
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("📈 Nowy level!")
    .setDescription(
      `${member} wbił **level ${level}** 🎉` +
        (roleMention ? `\nNowa ranga: ${roleMention}` : ""),
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}