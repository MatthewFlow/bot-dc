import { ChannelType, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { envGoodbyeChannelId, envWelcomeChannelId } from "../../config/env";
import { getConfig } from "../../config/guildConfig";
import { applyAutoRole } from "../../levels/autorole";
import { notifyLevelUp } from "../../levels/levelUpNotify";
import { addXp, getXp, levelFromXp } from "../../levels/xpStore";

export async function handleTestAddXp(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const amount = interaction.options.getInteger("amount", true);
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const targetMember = await guild.members.fetch(targetUser.id);

  const oldXp = getXp(guildId, targetUser.id);
  const oldLevel = levelFromXp(oldXp);

  addXp(guildId, targetUser.id, amount);

  const newXp = getXp(guildId, targetUser.id);
  const newLevel = levelFromXp(newXp);

  await applyAutoRole(targetMember, newLevel).catch(() => {});

  if (newLevel > oldLevel) {
    const cfg = getConfig(guildId);
    const target = cfg?.roleRewards
      ?.slice()
      .sort((a, b) => a.level - b.level)
      .filter((r) => r.level <= newLevel)
      .at(-1);

    await notifyLevelUp(
      targetMember,
      newLevel,
      target ? `<@&${target.roleId}>` : undefined,
    );
  }

  await interaction.reply({
    ephemeral: true,
    content:
      `Dodano **+${amount} XP** dla ${targetUser}\n` +
      `XP: **${oldXp} → ${newXp}**\n` +
      `Level: **${oldLevel} → ${newLevel}**`,
  });
}

export async function handleTestWelcome(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = getConfig(guildId);
  const channelId = cfg?.welcomeChannelId ?? envWelcomeChannelId;

  if (!channelId) {
    await interaction.reply({
      content: "Nie ustawiono kanału powitań. Użyj /cfg_setwelcome",
      ephemeral: true,
    });
    return;
  }

  const ch = guild.channels.cache.get(channelId);
  const ok =
    ch &&
    (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement);

  if (!ok) {
    await interaction.reply({
      content: "Kanał powitań nie istnieje albo nie jest tekstowy.",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Witamy! (TEST)")
    .setDescription(`To jest testowe powitanie, ${interaction.user} 😄`)
    .setTimestamp();

  await ch.send({ embeds: [embed] });
  await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
}

export async function handleTestGoodbye(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = getConfig(guildId);
  const channelId = cfg?.goodbyeChannelId ?? envGoodbyeChannelId;

  if (!channelId) {
    await interaction.reply({
      content: "Nie ustawiono kanału pożegnań. Użyj /cfg_setgoodbye",
      ephemeral: true,
    });
    return;
  }

  const ch = guild.channels.cache.get(channelId);
  const ok =
    ch &&
    (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement);

  if (!ok) {
    await interaction.reply({
      content: "Kanał pożegnań nie istnieje albo nie jest tekstowy.",
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("Żegnamy! (TEST)")
    .setDescription(`To jest testowe pożegnanie, ${interaction.user.username}`)
    .setTimestamp();

  await ch.send({ embeds: [embed] });
  await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
}
