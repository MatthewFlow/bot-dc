import { ChannelType, type ChatInputCommandInteraction } from "discord.js";

import { getConfig, setConfig } from "../../config/guildConfig";
import { applyAutoRole } from "../../levels/autorole";
import { getXp, levelFromXp } from "../../levels/xpStore";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTextChannel(type: ChannelType) {
  return type === ChannelType.GuildText || type === ChannelType.GuildAnnouncement;
}

export async function handleCfgSetWelcome(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel("channel", true);

  if (!isTextChannel(channel.type)) {
    await interaction.reply({
      content: "Wybierz kanał tekstowy (zwykły) albo ogłoszenia.",
      ephemeral: true,
    });
    return;
  }

  setConfig(guildId, { welcomeChannelId: channel.id });
  await interaction.reply({
    content: `Ustawiono kanał powitań na ${channel}`,
    ephemeral: true,
  });
}

export async function handleCfgSetGoodbye(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel("channel", true);

  if (!isTextChannel(channel.type)) {
    await interaction.reply({
      content: "Wybierz kanał tekstowy (zwykły) albo ogłoszenia.",
      ephemeral: true,
    });
    return;
  }

  setConfig(guildId, { goodbyeChannelId: channel.id });
  await interaction.reply({
    content: `Ustawiono kanał pożegnań na ${channel}`,
    ephemeral: true,
  });
}

export async function handleCfgAddReward(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const level = interaction.options.getInteger("level", true);
  const role = interaction.options.getRole("role", true);

  const cfg = getConfig(guildId) ?? {};
  const rewards = cfg.roleRewards ?? [];

  const filtered = rewards.filter((r) => r.level !== level);
  filtered.push({ level, roleId: role.id });
  filtered.sort((a, b) => a.level - b.level);

  setConfig(guildId, { roleRewards: filtered });

  await interaction.reply({
    ephemeral: true,
    content: `Dodano próg: level **${level}** → ${role}`,
  });
}

export async function handleCfgListRewards(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const cfg = getConfig(guildId);
  const rewards = cfg?.roleRewards ?? [];

  if (rewards.length === 0) {
    await interaction.reply({
      ephemeral: true,
      content: "Brak progów ról. Dodaj przez /cfg_addreward",
    });
    return;
  }

  const lines = rewards
    .slice()
    .sort((a, b) => a.level - b.level)
    .map((r) => `Level ${r.level} → <@&${r.roleId}>`)
    .join("\n");

  await interaction.reply({ ephemeral: true, content: `Progi ról:\n${lines}` });
}

export async function handleCfgSyncRole(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = await guild.members.fetch(targetUser.id);

  const xp = getXp(guildId, targetUser.id);
  const level = levelFromXp(xp);

  try {
    await applyAutoRole(member, level);
    await interaction.reply({
      ephemeral: true,
      content: `Zrobiono sync roli dla ${targetUser}. Level: **${level}**, XP: **${xp}** ✅`,
    });
  } catch (e) {
    await interaction.reply({
      ephemeral: true,
      content: `Nie udało się zsynchronizować roli.\nBłąd: ${String(e)}`,
    });
  }
}

export async function handleCfgSyncAll(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;
  const limit = interaction.options.getInteger("limit") ?? 50;

  await interaction.reply({
    ephemeral: true,
    content: `Start syncall… limit: ${limit}. Pobieram członków…`,
  });

  let processed = 0;
  let failed = 0;

  try {
    const members = await guild.members.fetch();

    for (const [, m] of members) {
      if (processed >= limit) break;
      if (m.user.bot) continue;

      processed++;

      const xp = getXp(guildId, m.id);
      const level = levelFromXp(xp);

      try {
        await applyAutoRole(m, level);
      } catch {
        failed++;
      }

      // throttle — avoids Discord rate limits on role assignment
      await sleep(350);
    }

    await interaction.editReply(
      `Syncall skończony ✅\nPrzetworzono: **${processed}**\nBłędy: **${failed}**`,
    );
  } catch (e) {
    await interaction.editReply(
      `Syncall przerwany ❌\nBłąd: ${String(e)}\nPrzetworzono do tej pory: **${processed}**`,
    );
  }
}

export async function handleCfgCheckRole(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = await guild.members.fetch(targetUser.id);

  const xp = getXp(guildId, targetUser.id);
  const level = levelFromXp(xp);

  const cfg = getConfig(guildId);
  const rewards = cfg?.roleRewards ?? [];

  if (rewards.length === 0) {
    await interaction.reply({
      ephemeral: true,
      content: "Brak skonfigurowanych progów ról.",
    });
    return;
  }

  const sortedRewards = rewards.slice().sort((a, b) => a.level - b.level);
  const eligible = sortedRewards.filter((r) => r.level <= level);
  const target = eligible.at(-1);

  const rewardRoleIds = new Set(sortedRewards.map((r) => r.roleId));
  const userRewardRoles = member.roles.cache.filter((r) => rewardRoleIds.has(r.id));

  const botMember = await guild.members.fetch(interaction.client.user!.id);

  let canAssign = "nie dotyczy";
  let targetRoleExists = "nie dotyczy";
  let hierarchyInfo = "nie dotyczy";

  if (target) {
    const role = guild.roles.cache.get(target.roleId);
    if (!role) {
      targetRoleExists = "❌ nie (brak w cache / nie istnieje)";
      canAssign = "❌ nie";
    } else {
      targetRoleExists = "✅ tak";
      const botHigher = botMember.roles.highest.position > role.position;
      hierarchyInfo = `BotHighest=${botMember.roles.highest.position}, Target=${role.position}`;
      canAssign = botHigher ? "✅ tak" : "❌ bot ma za niską rolę";
    }
  }

  const lines: string[] = [
    `Użytkownik: ${targetUser}`,
    `Level: **${level}**`,
    `XP: **${xp}**`,
    "",
    "Progi (level → rola):",
    ...sortedRewards.map((r) => `• ${r.level} → <@&${r.roleId}>`),
    "",
    `Eligible dla level ${level}:`,
    ...(eligible.length === 0
      ? ["• brak"]
      : eligible.map((r) => `• ${r.level} → <@&${r.roleId}>`)),
    "",
    `Docelowa rola: ${target ? `<@&${target.roleId}> (od level ${target.level})` : "brak"}`,
    `Docelowa rola istnieje: ${targetRoleExists}`,
    `Bot może nadać: ${canAssign}`,
    ...(hierarchyInfo !== "nie dotyczy" ? [`Hierarchia: ${hierarchyInfo}`] : []),
    "",
    "Role progresji użytkownika:",
    ...(userRewardRoles.size ? userRewardRoles.map((r) => `• ${r}`) : ["• brak"]),
  ];

  await interaction.reply({ ephemeral: true, content: lines.join("\n") });
}
