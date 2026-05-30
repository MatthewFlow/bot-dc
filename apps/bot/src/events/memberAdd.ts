import { guildConfigRepository, levelFromXp, xpRepository } from "@jurassic-haven/db";
import { EmbedBuilder, type GuildMember } from "discord.js";

import { envWelcomeChannelId } from "../config/env";
import { applyAutoRole } from "../levels/autorole";
import { isAllowedTextChannel } from "../utils/channels";

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";

function resolveMessage(template: string, member: GuildMember): string {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{member_count}/g, String(member.guild.memberCount));
}

export async function onMemberAdd(member: GuildMember) {
  const cfg = await guildConfigRepository.get(member.guild.id);

  if (cfg?.joinRoleId) {
    await member.roles.add(cfg.joinRoleId).catch((e) => {
      console.error(
        `[memberAdd] Nie udało się nadać joinRole dla ${member.user.username}:`,
        e,
      );
    });
  }

  const xp = await xpRepository.getXp(member.guild.id, member.id);
  const level = levelFromXp(xp);

  await applyAutoRole(member, level).catch(() => {});

  const channelId = cfg?.welcomeChannelId ?? envWelcomeChannelId;
  if (!channelId) return;

  const ch = member.guild.channels.cache.get(channelId);
  if (!isAllowedTextChannel(ch)) return;

  const message = resolveMessage(cfg?.welcomeMessage ?? DEFAULT_WELCOME, member);

  const embed = new EmbedBuilder()
    .setTitle("Witamy!")
    .setDescription(message)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
