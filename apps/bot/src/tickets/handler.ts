import { guildConfigRepository, ticketRepository, toDiscordEmbed } from "@jurassic-haven/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { logTicketEvent } from "./log";

/** Role uprawnione do obsługi ticketów: dwie role support (z configu) + admin (z env). */
function staffRoleIds(supportRoleId?: string, supportRoleId2?: string): string[] {
  return [...new Set([supportRoleId, supportRoleId2, process.env.CFG_ADMIN_ROLE_ID])].filter(
    (id): id is string => Boolean(id),
  );
}

function staffMentions(supportRoleId?: string, supportRoleId2?: string): string {
  return staffRoleIds(supportRoleId, supportRoleId2)
    .map((id) => `<@&${id}>`)
    .join(" ");
}

/**
 * Klik w "Złóż ticket" → pokazujemy modal, w którym user opisuje problem.
 * Sprawdzamy najpierw czy nie ma już aktywnego zgłoszenia (modal nie może być
 * poprzedzony defer/reply, więc walidacja musi się zmieścić w 3s).
 */
export async function showTicketModal(interaction: ButtonInteraction) {
  if (!interaction.guild) return;

  // Modal MUSI być pierwszą odpowiedzią w ciągu 3s — żadnych awaitów (DB) przed showModal.
  // Walidacja aktywnego ticketu odbywa się przy submicie (handleTicketSubmit).
  const input = new TextInputBuilder()
    .setCustomId("ticket_reason")
    .setLabel("Opisz swój problem")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder("Z czym potrzebujesz pomocy?");

  const modal = new ModalBuilder()
    .setCustomId("ticket_submit")
    .setTitle("Złóż ticket")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));

  await interaction.showModal(modal);
}

/**
 * Submit modala → tworzymy prywatny wątek, zapisujemy zgłoszenie w stanie
 * "pending" i pingujemy ekipę z przyciskiem "Przejmij zgłoszenie".
 */
export async function handleTicketSubmit(interaction: ModalSubmitInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const channel = interaction.channel;

  if (!guild || !channel || channel.type !== ChannelType.GuildText) {
    await interaction.editReply("Nie można złożyć ticketu w tym miejscu.");
    return;
  }

  const subject = interaction.fields.getTextInputValue("ticket_reason").trim();

  // ponowna kontrola (na wypadek wyścigu między modalem a submitem)
  const existing = await ticketRepository.getActiveByUser(guild.id, interaction.user.id);
  if (existing) {
    const live = await guild.channels.fetch(existing.threadId).catch(() => null);
    if (live) {
      await interaction.editReply(`Masz już aktywne zgłoszenie: <#${existing.threadId}>`);
      return;
    }
    await ticketRepository.close(existing.threadId);
  }

  let thread;
  try {
    thread = await channel.threads.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.PrivateThread,
      reason: `Ticket złożony przez ${interaction.user.tag}`,
    });
  } catch {
    await interaction.editReply(
      "Nie udało się utworzyć ticketu. Sprawdź uprawnienia bota (Manage Threads / Create Private Threads).",
    );
    return;
  }

  await ticketRepository.create({
    guildId: guild.id,
    threadId: thread.id,
    userId: interaction.user.id,
    subject,
  });

  await thread.members.add(interaction.user.id);

  const cfg = await guildConfigRepository.get(guild.id);
  const mentions = staffMentions(cfg?.ticketSupportRoleId, cfg?.ticketSupportRoleId2);

  const embed = new EmbedBuilder()
    .setTitle("🕓 Nowe zgłoszenie — oczekuje")
    .setColor(0xf59e0b)
    .setDescription(`Zgłoszenie od ${interaction.user}.\n\n**Treść:**\n${subject}`)
    .addFields({
      name: "Status",
      value: "Oczekuje na przejęcie przez moderatora lub admina.",
    })
    .setTimestamp();

  const claimButton = new ButtonBuilder()
    .setCustomId("ticket_claim")
    .setLabel("Przejmij zgłoszenie")
    .setStyle(ButtonStyle.Success)
    .setEmoji("✋");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(claimButton);

  await thread.send({
    content: mentions || undefined,
    embeds: [embed],
    components: [row],
  });

  await logTicketEvent(guild, "open", {
    threadId: thread.id,
    userId: interaction.user.id,
  });

  await interaction.editReply(
    `Twoje zgłoszenie zostało złożone: ${thread}\nCzeka na odpowiedź moderatora lub admina.`,
  );
}

/** Przejęcie zgłoszenia przez osobę z rolą support lub admina. */
export async function handleTicketClaim(interaction: ButtonInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const channel = interaction.channel;

  if (!guild || !channel?.isThread()) {
    await interaction.editReply("To działa tylko wewnątrz wątku ticketu.");
    return;
  }

  const ticket = await ticketRepository.getByThread(channel.id);
  if (!ticket) {
    await interaction.editReply("Ten wątek nie jest ticketem.");
    return;
  }

  const member = await guild.members.fetch(interaction.user.id);
  const cfg = await guildConfigRepository.get(guild.id);
  const allowedRoleIds = staffRoleIds(
    cfg?.ticketSupportRoleId,
    cfg?.ticketSupportRoleId2,
  );
  const allowed = allowedRoleIds.some((id) => member.roles.cache.has(id));

  if (!allowed) {
    await interaction.editReply(
      "Tylko moderator lub admin może przejąć to zgłoszenie.",
    );
    return;
  }

  if (ticket.status !== "pending") {
    await interaction.editReply(
      ticket.assignedTo
        ? `Zgłoszenie zostało już przejęte przez <@${ticket.assignedTo}>.`
        : "To zgłoszenie nie oczekuje już na przejęcie.",
    );
    return;
  }

  await ticketRepository.claim(channel.id, interaction.user.id);

  // Usuwamy przycisk z wiadomości, żeby nikt nie klikał drugi raz
  await interaction.message.edit({ components: [] }).catch(() => {});
  await channel.send(
    `✋ ${interaction.user} przejął to zgłoszenie i zaraz pomoże.`,
  );

  await interaction.editReply("Przejąłeś zgłoszenie ✅");
}

export async function handleTicketSetup(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      ephemeral: true,
      content: "Tej komendy można użyć tylko na kanale tekstowym.",
    });
    return;
  }

  const guild = interaction.guild;
  const cfg = guild ? await guildConfigRepository.get(guild.id) : null;

  // Panel jest statyczny — podstawiamy tylko zmienne kontekstu serwera.
  const replace = (s: string) =>
    s
      .replace(/{server}/g, guild?.name ?? "")
      .replace(/{member_count}/g, String(guild?.memberCount ?? ""));

  const embed = toDiscordEmbed(
    cfg?.ticketPanelEmbed ?? {
      title: "📩 Złóż ticket",
      description:
        "Naciśnij przycisk poniżej, opisz swój problem, a Twoje zgłoszenie trafi do ekipy. " +
        "Po przejęciu przez moderatora lub admina otrzymasz pomoc w prywatnym wątku.",
      color: 0x5865f2,
    },
    replace,
  );

  const button = new ButtonBuilder()
    .setCustomId("ticket_open")
    .setLabel((cfg?.ticketPanelButton?.label?.trim() || "Złóż ticket").slice(0, 80))
    .setStyle(ButtonStyle.Primary);

  const emoji = cfg?.ticketPanelButton?.emoji?.trim() || "📩";
  if (emoji) button.setEmoji(emoji);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ ephemeral: true, content: "Panel ticketów ustawiony ✅" });
}

export async function handleTicketClose(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel;

  if (!channel?.isThread()) {
    await interaction.reply({
      ephemeral: true,
      content: "Tej komendy można użyć tylko wewnątrz wątku ticketu.",
    });
    return;
  }

  const ticket = await ticketRepository.getByThread(channel.id);
  if (!ticket || ticket.status === "closed") {
    await interaction.reply({
      ephemeral: true,
      content: "Ten wątek nie jest aktywnym ticketem.",
    });
    return;
  }

  await interaction.reply({ content: "Zamykam ticket…" });
  await ticketRepository.close(channel.id);

  if (interaction.guild) {
    await logTicketEvent(interaction.guild, "close", {
      threadId: channel.id,
      userId: ticket.userId,
      actorId: interaction.user.id,
    });
  }

  // Lock przed archiwizacją — inaczej ktokolwiek napisze, odarchiwizuje wątek
  await channel.setLocked(true).catch(() => {});
  await channel.setArchived(true, `Zamknięty przez ${interaction.user.tag}`);
}

export async function handleTicketAdd(interaction: ChatInputCommandInteraction) {
  const channel = interaction.channel;

  if (!channel?.isThread()) {
    await interaction.reply({
      ephemeral: true,
      content: "Tej komendy można użyć tylko wewnątrz wątku ticketu.",
    });
    return;
  }

  const ticket = await ticketRepository.getByThread(channel.id);
  if (!ticket) {
    await interaction.reply({ ephemeral: true, content: "Ten wątek nie jest ticketem." });
    return;
  }

  const user = interaction.options.getUser("user", true);
  await channel.members.add(user.id);

  await interaction.reply({ ephemeral: true, content: `${user} dodany do ticketu.` });
}
