import {
  type EmbedConfig,
  guildConfigRepository,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import { EmbedBuilder, type GuildMember } from "discord.js";

function buildLevelUpEmbed(
  member: GuildMember,
  level: number,
  roleMention: string | undefined,
  embedCfg: EmbedConfig | undefined,
) {
  if (embedCfg) {
    const replace = (s: string) =>
      s
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name)
        .replace(/{level}/g, String(level))
        .replace(/{role}/g, roleMention ?? "")
        .replace(/{avatar}/g, member.user.displayAvatarURL({ size: 256 }));
    return toDiscordEmbed(embedCfg, replace);
  }

  return new EmbedBuilder()
    .setTitle("📈 Nowy level!")
    .setDescription(
      `${member} wbił **level ${level}** 🎉` +
        (roleMention ? `\nNowa ranga: ${roleMention}` : ""),
    )
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();
}

export async function notifyLevelUp(
  member: GuildMember,
  level: number,
  roleMention?: string,
  opts?: { dm?: boolean; suppressChannel?: boolean },
) {
  const cfg = await guildConfigRepository.get(member.guild.id);
  const embed = buildLevelUpEmbed(member, level, roleMention, cfg?.levelUpEmbed);

  if (opts?.dm) {
    await member.send({ embeds: [embed] }).catch(() => {});
  }

  if (opts?.suppressChannel) return;

  const channelId = cfg?.levelUpChannelId;
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) return;

  try {
    await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error(
      `[levelUpNotify] Nie udało się wysłać powiadomienia na kanał ${channelId}:`,
      e,
    );
  }
}
