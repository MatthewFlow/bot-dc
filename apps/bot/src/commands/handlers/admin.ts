import { XP_SYNCALL_DELAY_MS } from "@jurassic-haven/db";
import { levelFromXp } from "@jurassic-haven/db";
import { guildConfigRepository, xpRepository } from "@jurassic-haven/db";
import { ChannelType, type ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { applyAutoRole } from "../../levels/autorole";

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
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await guildConfigRepository.set(guildId, { welcomeChannelId: channel.id });
  await interaction.reply({
    content: `Ustawiono kanał powitań na ${channel}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCfgSetGoodbye(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel("channel", true);

  if (!isTextChannel(channel.type)) {
    await interaction.reply({
      content: "Wybierz kanał tekstowy (zwykły) albo ogłoszenia.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await guildConfigRepository.set(guildId, { goodbyeChannelId: channel.id });
  await interaction.reply({
    content: `Ustawiono kanał pożegnań na ${channel}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCfgAddReward(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const level = interaction.options.getInteger("level", true);
  const role = interaction.options.getRole("role", true);

  const cfg = await guildConfigRepository.get(guildId);
  const rewards = cfg?.roleRewards ?? [];

  const filtered = rewards.filter((r) => r.level !== level);
  filtered.push({ level, roleId: role.id });
  filtered.sort((a, b) => a.level - b.level);

  await guildConfigRepository.set(guildId, { roleRewards: filtered });
  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `Dodano próg: level **${level}** → ${role}`,
  });
}

export async function handleCfgRoleList(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const cfg = await guildConfigRepository.get(guildId);
  const rewards = cfg?.roleRewards ?? [];

  if (rewards.length === 0) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
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
    flags: MessageFlags.Ephemeral,
    content: `Progi ról:\n${lines}`,
  });
}

export async function handleCfgSyncXp(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const targetUser = interaction.options.getUser("user");

  if (targetUser) {
    const member = await guild.members.fetch(targetUser.id);
    const xp = await xpRepository.getXp(guildId, targetUser.id);
    const level = levelFromXp(xp);

    try {
      await applyAutoRole(member, level);
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Zrobiono sync XP dla ${targetUser}. Level: **${level}**, XP: **${xp}** ✅`,
      });
    } catch (e) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: `Nie udało się zsynchronizować roli.\nBłąd: ${String(e)}`,
      });
    }
    return;
  }

  const limit = interaction.options.getInteger("limit") ?? 50;

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: `Start syncxp… limit: ${limit}. Pobieram członków…`,
  });

  let processed = 0;
  let failed = 0;

  try {
    const members = await guild.members.fetch();

    for (const [, m] of members) {
      if (processed >= limit) break;
      if (m.user.bot) continue;

      processed++;

      const xp = await xpRepository.getXp(guildId, m.id);
      const level = levelFromXp(xp);

      try {
        await applyAutoRole(m, level);
      } catch {
        failed++;
      }

      // throttle — avoids Discord rate limits on role assignment
      await sleep(XP_SYNCALL_DELAY_MS);
    }

    await interaction.editReply(
      `Syncxp skończony ✅\nPrzetworzono: **${processed}**\nBłędy: **${failed}**`,
    );
  } catch (e) {
    await interaction.editReply(
      `Syncxp przerwany ❌\nBłąd: ${String(e)}\nPrzetworzono do tej pory: **${processed}**`,
    );
  }
}

export async function handleCfgCheckRole(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const targetUser = interaction.options.getUser("user") ?? interaction.user;
  const member = await guild.members.fetch(targetUser.id);

  const xp = await xpRepository.getXp(guildId, targetUser.id);
  const level = levelFromXp(xp);

  const cfg = await guildConfigRepository.get(guildId);
  const rewards = cfg?.roleRewards ?? [];

  const rewardRoleIds = new Set(rewards.map((r) => r.roleId));
  const userRewardRoles = member.roles.cache.filter((r) => rewardRoleIds.has(r.id));

  const lines: string[] = [
    `Użytkownik: ${targetUser}`,
    `Level: **${level}**`,
    `XP: **${xp}**`,
    "",
    "Role progresji użytkownika:",
    ...(userRewardRoles.size ? userRewardRoles.map((r) => `• ${r}`) : ["• brak"]),
  ];

  await interaction.reply({ flags: MessageFlags.Ephemeral, content: lines.join("\n") });
}

export async function handleCfgSyncVerify(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const guild = interaction.guild!;

  const cfg = await guildConfigRepository.get(guildId);

  if (!cfg?.joinRoleId) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content:
        "Nie ustawiono roli niezweryfikowanego. Ustaw ją najpierw w panelu (Auto-role).",
    });
    return;
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    content: "Start syncverify… Pobieram członków…",
  });

  let assigned = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const members = await guild.members.fetch();

    for (const [, m] of members) {
      if (m.user.bot) continue;

      const hasJoin = m.roles.cache.has(cfg.joinRoleId);
      const hasVerified = cfg.verifiedRoleId
        ? m.roles.cache.has(cfg.verifiedRoleId)
        : false;

      if (hasJoin || hasVerified) {
        skipped++;
        continue;
      }

      try {
        await m.roles.add(cfg.joinRoleId);
        assigned++;
      } catch {
        failed++;
      }

      await sleep(XP_SYNCALL_DELAY_MS);
    }

    await interaction.editReply(
      `Syncverify skończony ✅\nNadano rolę niezweryfikowanego: **${assigned}**\nPominięto (już mają rolę): **${skipped}**\nBłędy: **${failed}**`,
    );
  } catch (e) {
    await interaction.editReply(
      `Syncverify przerwany ❌\nBłąd: ${String(e)}\nNadano do tej pory: **${assigned}**`,
    );
  }
}

export async function handleCfgSetModLog(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const channel = interaction.options.getChannel("channel", true);

  if (!isTextChannel(channel.type)) {
    await interaction.reply({
      content: "Wybierz kanał tekstowy.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await guildConfigRepository.set(guildId, { modLogChannelId: channel.id });
  await interaction.reply({
    content: `Ustawiono kanał logów na ${channel}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCfgSetTicketRole(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId!;
  const role = interaction.options.getRole("role", true);

  await guildConfigRepository.set(guildId, { ticketSupportRoleId: role.id });
  await interaction.reply({
    content: `Ustawiono rolę supportu na ${role}`,
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleCfgClear(interaction: ChatInputCommandInteraction) {
  const amount = interaction.options.getInteger("amount", true);
  const channel = interaction.channel;

  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    await interaction.reply({
      content: "Tej komendy można użyć tylko na kanale tekstowym.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const deleted = await channel.bulkDelete(amount, true);
    const skipped = amount - deleted.size;
    const skippedNote =
      skipped > 0 ? `\n${skipped} wiadomości pominięto (starsze niż 14 dni).` : "";

    await interaction.editReply(
      `Usunięto **${deleted.size}** wiadomości. ✅${skippedNote}`,
    );
  } catch (e) {
    console.error("[cfg_clear] Błąd usuwania wiadomości:", e);
    await interaction.editReply(
      "Nie udało się usunąć wiadomości. Sprawdź uprawnienia bota.",
    );
  }
}
