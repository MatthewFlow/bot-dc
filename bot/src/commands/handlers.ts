import { ChannelType, type ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

import { envGoodbyeChannelId, envWelcomeChannelId } from "../config/env";
import { getConfig, setConfig } from "../config/guildConfig";
import { applyAutoRole } from "../levels/autorole";
import { addXp, getXp, levelFromXp } from "../levels/xpStore";
import { isAllowedTextChannel } from "../utils/channels";
import { notifyLevelUp } from "../levels/levelUpNotify";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requireAdminRole(interaction: ChatInputCommandInteraction) {
  const adminRoleId = process.env.CFG_ADMIN_ROLE_ID;
  if (!adminRoleId) {
    await interaction.reply({
      content: "Brak CFG_ADMIN_ROLE_ID w .env. Ustaw ID roli admina.",
      ephemeral: true,
    });
    return false;
  }

  if (!interaction.guild) return false;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(adminRoleId);

  if (!hasRole) {
    await interaction.reply({
      content: "Nie masz wymaganej roli do użycia tej komendy.",
      ephemeral: true,
    });
    return false;
  }

  return true;
}

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) {
    await interaction.reply({
      content: "Ta komenda działa tylko na serwerze.",
      ephemeral: true,
    });
    return;
  }

  // ========= ROLE GUARD (cfg_* + test_*) =========
  const isConfigCommand = interaction.commandName.startsWith("cfg_");
  const isTestCommand = interaction.commandName.startsWith("test_");

  if (isConfigCommand || isTestCommand) {
    const ok = await requireAdminRole(interaction);
    if (!ok) return;
  }

  // ========= USER: /level =========
  if (interaction.commandName === "level") {
    const xp = getXp(guildId, interaction.user.id);
    const level = levelFromXp(xp);
    const nextLevelXp = level * 100;
    const missing = Math.max(0, nextLevelXp - xp);

    await interaction.reply({
      ephemeral: true,
      content:
        `Twój level: **${level}**\n` +
        `XP: **${xp}**\n` +
        `Do następnego levelu brakuje: **${missing} XP**`,
    });
    return;
  }

  // ========= TEST: /test_addxp =========
  if (interaction.commandName === "test_addxp") {
  const amount = interaction.options.getInteger("amount", true);
  const targetUser = interaction.options.getUser("user") ?? interaction.user;
 
  const targetMember = await interaction.guild.members.fetch(targetUser.id);
 
  const oldXp = getXp(guildId, targetUser.id);
  const oldLevel = levelFromXp(oldXp);
 
  addXp(guildId, targetUser.id, amount);
 
  const newXp = getXp(guildId, targetUser.id);
  const newLevel = levelFromXp(newXp);
 
  await applyAutoRole(targetMember, newLevel).catch(() => {});
 
  // level-up notify przez wspólną funkcję zamiast inline
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
  return;
}

  // ========= CFG: AUTO ROLE =========
  if (interaction.commandName === "cfg_addreward") {
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
    return;
  }

  if (interaction.commandName === "cfg_listrewards") {
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

    await interaction.reply({
      ephemeral: true,
      content: `Progi ról:\n${lines}`,
    });
    return;
  }

  // ========= CFG: FORCE SYNC ROLE (1 USER) =========
  if (interaction.commandName === "cfg_syncrole") {
    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id);

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
        content: `Nie udało się zsynchronizować roli.\n` + `Błąd: ${String(e)}`,
      });
    }
    return;
  }

  // ========= CFG: SYNC ALL (LIMITED + THROTTLED) =========
  if (interaction.commandName === "cfg_syncall") {
    const limit = interaction.options.getInteger("limit") ?? 50;

    await interaction.reply({
      ephemeral: true,
      content: `Start syncall… limit: ${limit}. Pobieram członków…`,
    });

    let processed = 0;
    let failed = 0;

    try {
      const members = await interaction.guild.members.fetch();

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

        await sleep(350);
      }

      await interaction.editReply(
        `Syncall skończony ✅\n` +
          `Przetworzono: **${processed}**\n` +
          `Błędy: **${failed}**`,
      );
    } catch (e) {
      await interaction.editReply(
        `Syncall przerwany ❌\nBłąd: ${String(e)}\n` +
          `Przetworzono do tej pory: **${processed}**`,
      );
    }

    return;
  }

  // ========= CFG: CHECK ROLE (DEBUG) =========
  if (interaction.commandName === "cfg_checkrole") {
    const targetUser = interaction.options.getUser("user") ?? interaction.user;

    const member = await interaction.guild.members.fetch(targetUser.id);

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

    const botMember = await interaction.guild.members.fetch(interaction.client.user!.id);

    let canAssign = "nie dotyczy";
    let targetRoleExists = "nie dotyczy";
    let hierarchyInfo = "nie dotyczy";

    if (target) {
      const role = interaction.guild.roles.cache.get(target.roleId);
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

    const lines: string[] = [];

    lines.push(`Użytkownik: ${targetUser}`);
    lines.push(`Level: **${level}**`);
    lines.push(`XP: **${xp}**`);
    lines.push("");

    lines.push("Progi (level → rola):");
    for (const r of sortedRewards) {
      lines.push(`• ${r.level} → <@&${r.roleId}>`);
    }

    lines.push("");
    lines.push(`Eligible dla level ${level}:`);
    if (eligible.length === 0) {
      lines.push("• brak");
    } else {
      for (const r of eligible) {
        lines.push(`• ${r.level} → <@&${r.roleId}>`);
      }
    }

    lines.push("");
    lines.push(
      `Docelowa rola: ${
        target ? `<@&${target.roleId}> (od level ${target.level})` : "brak"
      }`,
    );
    lines.push(`Docelowa rola istnieje: ${targetRoleExists}`);
    lines.push(`Bot może nadać: ${canAssign}`);
    if (hierarchyInfo !== "nie dotyczy") lines.push(`Hierarchia: ${hierarchyInfo}`);

    lines.push("");
    lines.push("Role progresji użytkownika:");
    if (userRewardRoles.size) {
      lines.push(userRewardRoles.map((r) => `• ${r}`).join("\n"));
    } else {
      lines.push("• brak");
    }

    await interaction.reply({
      ephemeral: true,
      content: lines.join("\n"),
    });
    return;
  }

  // ========= CFG: WELCOME / GOODBYE =========
  if (interaction.commandName === "cfg_setwelcome") {
    const channel = interaction.options.getChannel("channel", true);

    const ok =
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement;

    if (!ok) {
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
    return;
  }

  if (interaction.commandName === "cfg_setgoodbye") {
    const channel = interaction.options.getChannel("channel", true);

    const ok =
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement;

    if (!ok) {
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
    return;
  }

  // ========= TESTS =========
  if (interaction.commandName === "test_welcome") {
    const cfg = getConfig(guildId);
    const channelId = cfg?.welcomeChannelId ?? envWelcomeChannelId;

    if (!channelId) {
      await interaction.reply({
        content: "Nie ustawiono kanału powitań. Użyj /cfg_setwelcome",
        ephemeral: true,
      });
      return;
    }

    const ch = interaction.guild.channels.cache.get(channelId);
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
    return;
  }

  if (interaction.commandName === "test_goodbye") {
    const cfg = getConfig(guildId);
    const channelId = cfg?.goodbyeChannelId ?? envGoodbyeChannelId;

    if (!channelId) {
      await interaction.reply({
        content: "Nie ustawiono kanału pożegnań. Użyj /cfg_setgoodbye",
        ephemeral: true,
      });
      return;
    }

    const ch = interaction.guild.channels.cache.get(channelId);
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
      .setDescription(`To jest testowe pożegnanie, ${interaction.user.tag}`)
      .setTimestamp();

    await ch.send({ embeds: [embed] });
    await interaction.reply({ content: "Wysłano ✅", ephemeral: true });
    return;
  }

  await interaction.reply({ content: "Nieznana komenda.", ephemeral: true });
}
