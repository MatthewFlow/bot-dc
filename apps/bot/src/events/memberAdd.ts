import { guildConfigRepository, levelFromXp, toDiscordEmbed, xpRepository } from "@jurassic-haven/db";
import { EmbedBuilder, type GuildMember } from "discord.js";

import { envWelcomeChannelId } from "../config/env";
import { applyAutoRole } from "../levels/autorole";
import { memberVarReplacer } from "../utils/embedVars";
import { isAllowedTextChannel } from "../utils/channels";

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";

function resolveMessage(template: string, member: GuildMember): string {
  return memberVarReplacer(member)(template);
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

  // Jeśli guild skonfigurował własny embed powitania — używamy go (ze zmiennymi).
  if (cfg?.welcomeEmbed) {
    const embed = toDiscordEmbed(cfg.welcomeEmbed, memberVarReplacer(member));
    await ch.send({ embeds: [embed] }).catch(() => {});
    return;
  }

  const message = resolveMessage(cfg?.welcomeMessage ?? DEFAULT_WELCOME, member);

  const embed = new EmbedBuilder()
    .setTitle("Witamy!")
    .setDescription(message)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();

  await ch.send({ embeds: [embed] }).catch(() => {});
}
