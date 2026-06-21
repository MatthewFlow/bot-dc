import {
  botJobRepository,
  guildConfigRepository,
  warnRepository,
} from "@jurassic-haven/db";
import {
  type ChatInputCommandInteraction,
  EmbedBuilder,
  type GuildMember,
} from "discord.js";

import { sendModLog, sendPunishDm } from "../../modlog";

/**
 * Wspólne zabezpieczenie akcji moderacyjnych: blokuje akcję na sobie,
 * na właścicielu serwera oraz na kimś z rolą równą/wyższą niż bot.
 * Zwraca komunikat błędu albo null gdy akcja jest dozwolona.
 */
function modGuard(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
  kind: "mute" | "kick" | "ban",
): string | null {
  if (member.id === interaction.user.id) {
    return "Nie możesz wykonać tej akcji na sobie.";
  }
  if (member.id === interaction.guild!.ownerId) {
    return "Nie możesz moderować właściciela serwera.";
  }
  if (kind === "ban" && !member.bannable) {
    return "Nie mogę zbanować tego użytkownika — sprawdź hierarchię ról i uprawnienia bota.";
  }
  if (kind === "kick" && !member.kickable) {
    return "Nie mogę wyrzucić tego użytkownika — sprawdź hierarchię ról i uprawnienia bota.";
  }
  if (kind === "mute" && !member.moderatable) {
    return "Nie mogę wyciszyć tego użytkownika — sprawdź hierarchię ról i uprawnienia bota.";
  }
  return null;
}

export async function handleModWarn(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "Brak powodu";

  if (user.id === interaction.user.id) {
    await interaction.editReply("Nie możesz ostrzec samego siebie.");
    return;
  }

  await warnRepository.add({
    guildId: guild.id,
    userId: user.id,
    moderatorId: interaction.user.id,
    reason,
  });

  const all = await warnRepository.getAll(guild.id, user.id);

  await sendModLog(
    guild,
    "warn",
    user,
    interaction.user,
    reason,
    `Ostrzeżenie #${all.length}`,
  );

  const cfg = await guildConfigRepository.get(guild.id);
  if (cfg?.dmOnPunish) await sendPunishDm(user, guild.name, "warn", reason);

  // Auto-ban po przekroczeniu progu ostrzeżeń (0/brak = wyłączone).
  let autoBanNote = "";
  const threshold = cfg?.autoBanThreshold ?? 0;
  if (threshold > 0 && all.length >= threshold && user.id !== guild.ownerId) {
    const banReason = `Auto-ban po ${all.length} ostrzeżeniach`;
    if (cfg?.dmOnPunish) await sendPunishDm(user, guild.name, "ban", banReason);
    const banned = await guild.members
      .ban(user.id, { reason: banReason })
      .then(() => true)
      .catch(() => false);
    if (banned) {
      await sendModLog(guild, "ban", user, interaction.user, banReason, "Auto-ban");
      autoBanNote = `\n\n⛔ **Auto-ban** — użytkownik przekroczył próg ${threshold} ostrzeżeń.`;
    }
  }

  await interaction.editReply(
    `Ostrzeżenie **#${all.length}** dla ${user} zostało dodane.\nPowód: ${reason}${autoBanNote}`,
  );
}

export async function handleModWarnings(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);

  const warns = await warnRepository.getAll(guild.id, user.id);

  if (warns.length === 0) {
    await interaction.editReply(`${user} nie ma żadnych ostrzeżeń.`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Ostrzeżenia: ${user.username}`)
    .setColor(0xf59e0b)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(
      warns
        .map((w, i) => {
          const date = w.createdAt.toLocaleDateString("pl-PL");
          return `**#${i + 1}** — ${w.reason}\n<@${w.moderatorId}> · ${date}`;
        })
        .join("\n\n"),
    );

  await interaction.editReply({ embeds: [embed] });
}

export async function handleModClearWarns(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);

  const deleted = await warnRepository.clear(guild.id, user.id);

  await sendModLog(
    guild,
    "clearwarns",
    user,
    interaction.user,
    `Usunięto ${deleted} ostrzeżeń`,
  );

  await interaction.editReply(`Usunięto **${deleted}** ostrzeżeń dla ${user}.`);
}

export async function handleModMute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);
  const minutes = interaction.options.getInteger("duration", true);
  const reason = interaction.options.getString("reason") ?? "Brak powodu";

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.editReply("Użytkownik nie jest na serwerze.");
    return;
  }

  const err = modGuard(interaction, member, "mute");
  if (err) {
    await interaction.editReply(err);
    return;
  }

  try {
    await member.timeout(minutes * 60 * 1000, reason);
    const detail = `Czas: ${minutes} min`;
    await sendModLog(guild, "mute", user, interaction.user, reason, detail);
    const cfg = await guildConfigRepository.get(guild.id);
    if (cfg?.dmOnPunish) await sendPunishDm(user, guild.name, "mute", reason, detail);
    await interaction.editReply(
      `${user} wyciszony na **${minutes} min**.\nPowód: ${reason}`,
    );
  } catch {
    await interaction.editReply("Nie udało się wyciszyć. Sprawdź uprawnienia bota.");
  }
}

export async function handleModUnmute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "Brak powodu";

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.editReply("Użytkownik nie jest na serwerze.");
    return;
  }

  try {
    await member.timeout(null, reason);
    await sendModLog(guild, "unmute", user, interaction.user, reason);
    await interaction.editReply(`${user} timeout usunięty.`);
  } catch {
    await interaction.editReply(
      "Nie udało się usunąć timeoutu. Sprawdź uprawnienia bota.",
    );
  }
}

export async function handleModKick(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "Brak powodu";

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.editReply("Użytkownik nie jest na serwerze.");
    return;
  }

  const err = modGuard(interaction, member, "kick");
  if (err) {
    await interaction.editReply(err);
    return;
  }

  try {
    // DM przed wyrzuceniem — po nim bot i użytkownik nie dzielą już serwera.
    const cfg = await guildConfigRepository.get(guild.id);
    if (cfg?.dmOnPunish) await sendPunishDm(user, guild.name, "kick", reason);
    await member.kick(reason);
    await sendModLog(guild, "kick", user, interaction.user, reason);
    await interaction.editReply(
      `**${user.username}** został wyrzucony.\nPowód: ${reason}`,
    );
  } catch {
    await interaction.editReply("Nie udało się wyrzucić. Sprawdź uprawnienia bota.");
  }
}

export async function handleModBan(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const guild = interaction.guild!;
  const user = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "Brak powodu";
  const deleteMessageDays = interaction.options.getInteger("delete_messages") ?? 0;
  const durationMin = interaction.options.getInteger("duration");

  if (user.id === interaction.user.id) {
    await interaction.editReply("Nie możesz zbanować samego siebie.");
    return;
  }

  // Member może nie istnieć — banowanie kogoś spoza serwera jest dozwolone
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (member) {
    const err = modGuard(interaction, member, "ban");
    if (err) {
      await interaction.editReply(err);
      return;
    }
  }

  try {
    // DM przed banem — po nim wiadomość już się nie dostarczy.
    const cfg = await guildConfigRepository.get(guild.id);
    if (cfg?.dmOnPunish) await sendPunishDm(user, guild.name, "ban", reason);
    await guild.members.ban(user.id, {
      reason,
      deleteMessageSeconds: deleteMessageDays * 86400,
    });

    // Temp-ban: zaplanuj auto-unban przez kolejkę zadań.
    if (durationMin) {
      await botJobRepository
        .create({
          guildId: guild.id,
          type: "unban",
          runAt: new Date(Date.now() + durationMin * 60_000),
          recurrence: "once",
          userId: user.id,
          createdBy: interaction.user.id,
        })
        .catch(() => {});
    }

    const tempNote = durationMin ? ` na ${durationMin} min` : "";
    await sendModLog(
      guild,
      "ban",
      user,
      interaction.user,
      reason,
      durationMin ? `Temp-ban: ${durationMin} min` : undefined,
    );
    await interaction.editReply(
      `**${user.username}** został zbanowany${tempNote}.\nPowód: ${reason}`,
    );
  } catch {
    await interaction.editReply("Nie udało się zbanować. Sprawdź uprawnienia bota.");
  }
}
