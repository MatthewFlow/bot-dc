import { guildConfigRepository, levelFromXp, toDiscordEmbed, xpRepository } from "@jurassic-haven/db";
import { ChannelType, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { envGoodbyeChannelId, envWelcomeChannelId } from "../../config/env";
import { applyAutoRole } from "../../levels/autorole";
import { notifyLevelUp } from "../../levels/levelUpNotify";

const DEFAULT_WELCOME = "Siema {user}, miło że jesteś 😄";
const DEFAULT_GOODBYE = "{username} wyszedł z serwera.";

/** Variable replacer for test commands — uses the invoking user as the sample member. */
function testReplacer(interaction: ChatInputCommandInteraction): (template: string) => string {
  const avatar = interaction.user.displayAvatarURL({ size: 256 });
  return (template) =>
    template
      .replace(/{user}/g, `<@${interaction.user.id}>`)
      .replace(/{username}/g, interaction.user.username)
      .replace(/{server}/g, interaction.guild?.name ?? "serwer")
      .replace(/{member_count}/g, String(interaction.guild?.memberCount ?? 0))
      .replace(/{avatar}/g, avatar);
}

export async function handleCfgAddXp(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const amount = interaction.options.getInteger("amount", true);

  if (amount < 1) {
    await interaction.reply({ ephemeral: true, content: "Ilość XP musi być >= 1." });
    return;
  }

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const targetMember = await guild.members.fetch(targetUser.id);

  const oldXp = await xpRepository.getXp(guildId, targetUser.id);
  const oldLevel = levelFromXp(oldXp);

  const result = await xpRepository.addXp(guildId, targetUser.id, amount);

  await applyAutoRole(targetMember, result.newLevel).catch(() => {});

  if (result.newLevel > oldLevel) {
    const cfg = await guildConfigRepository.get(guildId);
    const target = cfg?.roleRewards
      ?.slice()
      .sort((a, b) => a.level - b.level)
      .filter((r) => r.level <= result.newLevel)
      .at(-1);

    await notifyLevelUp(
      targetMember,
      result.newLevel,
      target ? `<@&${target.roleId}>` : undefined,
    );
  }

  const newXp = await xpRepository.getXp(guildId, targetUser.id);

  await interaction.reply({
    ephemeral: true,
    content:
      `Dodano **+${amount} XP** dla ${targetUser}\n` +
      `XP: **${oldXp} → ${newXp}**\n` +
      `Level: **${oldLevel} → ${result.newLevel}**`,
  });
}

export async function handleTestWelcome(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = await guildConfigRepository.get(guildId);
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

  const replace = testReplacer(interaction);

  // Mirror the real welcome: use the configured embed when set, else legacy text.
  if (cfg?.welcomeEmbed) {
    await ch.send({ embeds: [toDiscordEmbed(cfg.welcomeEmbed, replace)] });
  } else {
    const embed = new EmbedBuilder()
      .setTitle("Witamy! (TEST)")
      .setDescription(replace(cfg?.welcomeMessage ?? DEFAULT_WELCOME))
      .setTimestamp();
    await ch.send({ embeds: [embed] });
  }

  await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
}

export async function handleTestGoodbye(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = await guildConfigRepository.get(guildId);
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

  const replace = testReplacer(interaction);

  if (cfg?.goodbyeEmbed) {
    await ch.send({ embeds: [toDiscordEmbed(cfg.goodbyeEmbed, replace)] });
  } else {
    const embed = new EmbedBuilder()
      .setTitle("Żegnamy! (TEST)")
      .setDescription(replace(cfg?.goodbyeMessage ?? DEFAULT_GOODBYE))
      .setTimestamp();
    await ch.send({ embeds: [embed] });
  }

  await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
}
