import { EmbedBuilder, type GuildMember } from "discord.js";

import { envWelcomeChannelId } from "../config/env";
import { getConfig } from "../config/store";
import { applyAutoRole } from "../levels/autorole";
import { getXp, levelFromXp } from "../levels/store";
import { isAllowedTextChannel } from "../utils/channels";

export async function onMemberAdd(member: GuildMember) {
  // 1) Nadaj rolę startową od razu (na bazie XP=0 jeśli nie ma wpisu)
  const xp = getXp(member.guild.id, member.id); // jeśli nie ma, powinno zwrócić 0
  const level = levelFromXp(xp);

  await applyAutoRole(member, level).catch(() => {});

  // 2) Powitanie (jak było)
  const cfg = getConfig(member.guild.id);
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
