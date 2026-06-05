import {
  EmbedBuilder,
  type Guild,
  type GuildMember,
  type Message,
  type PartialGuildMember,
  type PartialMessage,
} from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";

type LogCategory =
  | "messageDelete"
  | "messageEdit"
  | "memberJoin"
  | "memberLeave"
  | "roleChanges"
  | "nicknameChanges";

/** Sends an embed to the server-log channel if the category is enabled. */
async function post(guild: Guild, category: LogCategory, embed: EmbedBuilder) {
  const cfg = await getCachedGuildConfig(guild.id);
  const log = cfg?.serverLog;
  if (!log?.enabled || !log.channelId || !log[category]) return;

  const channel =
    guild.channels.cache.get(log.channelId) ??
    (await guild.channels.fetch(log.channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  await channel.send({ embeds: [embed] }).catch(() => {});
}

export async function onMessageDeleteLog(message: Message | PartialMessage) {
  if (!message.guild || message.author?.bot) return;

  const embed = new EmbedBuilder()
    .setTitle("🗑️ Wiadomość usunięta")
    .setColor(0xef4444)
    .addFields(
      {
        name: "Autor",
        value: message.author ? `${message.author} \`${message.author.id}\`` : "nieznany",
        inline: true,
      },
      { name: "Kanał", value: `<#${message.channelId}>`, inline: true },
      { name: "Treść", value: message.content?.slice(0, 1024) || "(brak / niedostępna)" },
    )
    .setTimestamp();

  await post(message.guild, "messageDelete", embed);
}

export async function onMessageUpdateLog(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return; // ignore non-content edits

  const embed = new EmbedBuilder()
    .setTitle("✏️ Wiadomość edytowana")
    .setColor(0xf59e0b)
    .setURL(newMessage.url)
    .addFields(
      {
        name: "Autor",
        value: newMessage.author
          ? `${newMessage.author} \`${newMessage.author.id}\``
          : "nieznany",
        inline: true,
      },
      { name: "Kanał", value: `<#${newMessage.channelId}>`, inline: true },
      { name: "Przed", value: oldMessage.content?.slice(0, 1024) || "(niedostępna)" },
      { name: "Po", value: newMessage.content?.slice(0, 1024) || "(niedostępna)" },
    )
    .setTimestamp();

  await post(newMessage.guild, "messageEdit", embed);
}

export async function onMemberJoinLog(member: GuildMember) {
  const embed = new EmbedBuilder()
    .setTitle("📥 Użytkownik dołączył")
    .setColor(0x22c55e)
    .setDescription(`${member} \`${member.id}\``)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields({
      name: "Konto utworzone",
      value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
    })
    .setTimestamp();

  await post(member.guild, "memberJoin", embed);
}

export async function onMemberLeaveLog(member: GuildMember | PartialGuildMember) {
  const name = member.user?.username ? `${member.user.username} ` : "";
  const embed = new EmbedBuilder()
    .setTitle("📤 Użytkownik wyszedł")
    .setColor(0x6b7280)
    .setDescription(`${name}<@${member.id}> \`${member.id}\``)
    .setTimestamp();

  await post(member.guild, "memberLeave", embed);
}

export async function onGuildMemberUpdateLog(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
) {
  const guild = newMember.guild;

  if (oldMember.nickname !== newMember.nickname) {
    const embed = new EmbedBuilder()
      .setTitle("✏️ Zmiana pseudonimu")
      .setColor(0x6366f1)
      .setDescription(`${newMember} \`${newMember.id}\``)
      .addFields(
        { name: "Przed", value: oldMember.nickname ?? "(brak)", inline: true },
        { name: "Po", value: newMember.nickname ?? "(brak)", inline: true },
      )
      .setTimestamp();
    await post(guild, "nicknameChanges", embed);
  }

  const oldRoles = oldMember.roles?.cache;
  if (oldRoles) {
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));
    if (added.size || removed.size) {
      const embed = new EmbedBuilder()
        .setTitle("🎭 Zmiana ról")
        .setColor(0x5865f2)
        .setDescription(`${newMember} \`${newMember.id}\``)
        .setTimestamp();
      if (added.size) {
        embed.addFields({
          name: "Dodane",
          value: added.map((r) => `${r}`).join(", ").slice(0, 1024),
        });
      }
      if (removed.size) {
        embed.addFields({
          name: "Usunięte",
          value: removed.map((r) => `${r}`).join(", ").slice(0, 1024),
        });
      }
      await post(guild, "roleChanges", embed);
    }
  }
}
