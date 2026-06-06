import { type ServerLogConfig } from "@jurassic-haven/db";
import {
  AuditLogEvent,
  EmbedBuilder,
  type Guild,
  type GuildMember,
  type GuildTextBasedChannel,
  type Message,
  type PartialGuildMember,
  type PartialMessage,
  type PartialUser,
  PermissionFlagsBits,
  type User,
} from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";

type LogCategory =
  | "messageDelete"
  | "messageEdit"
  | "memberJoin"
  | "memberLeave"
  | "roleChanges"
  | "nicknameChanges";

/** Resolves the log config + target channel for a category, or null if disabled. */
async function resolveContext(
  guild: Guild,
  category: LogCategory,
): Promise<{ log: ServerLogConfig; channel: GuildTextBasedChannel } | null> {
  const cfg = await getCachedGuildConfig(guild.id);
  const log = cfg?.serverLog;
  if (!log?.enabled || !log.channelId || !log[category]) return null;

  const channel =
    guild.channels.cache.get(log.channelId) ??
    (await guild.channels.fetch(log.channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return null;

  return { log, channel };
}

function channelExempt(log: ServerLogConfig, channelId: string): boolean {
  return (log.exemptChannelIds ?? []).includes(channelId);
}

function memberExempt(
  log: ServerLogConfig,
  member: GuildMember | PartialGuildMember | null,
): boolean {
  if (!member) return false;
  return (log.exemptRoleIds ?? []).some((id) => member.roles.cache.has(id));
}

/** Best-effort: who deleted the message (via the audit log). Needs View Audit Log. */
async function fetchDeleter(
  guild: Guild,
  message: Message | PartialMessage,
): Promise<User | PartialUser | null> {
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ViewAuditLog) || !message.author) return null;

  try {
    const logs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 5,
    });
    const entry = logs.entries.find((e) => {
      const extra = e.extra as { channel?: { id: string } } | undefined;
      return (
        e.target?.id === message.author?.id &&
        extra?.channel?.id === message.channelId &&
        Date.now() - e.createdTimestamp < 10_000
      );
    });
    return entry?.executor ?? null;
  } catch {
    return null;
  }
}

export async function onMessageDeleteLog(message: Message | PartialMessage) {
  if (!message.guild || message.author?.bot) return;
  const ctx = await resolveContext(message.guild, "messageDelete");
  if (!ctx) return;
  if (channelExempt(ctx.log, message.channelId) || memberExempt(ctx.log, message.member)) {
    return;
  }

  const deleter = await fetchDeleter(message.guild, message);

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
      ...(deleter
        ? [{ name: "Usunął", value: `${deleter} \`${deleter.id}\``, inline: true }]
        : []),
      { name: "Treść", value: message.content?.slice(0, 1024) || "(brak / niedostępna)" },
    )
    .setTimestamp();

  await ctx.channel.send({ embeds: [embed] }).catch(() => {});
}

export async function onMessageUpdateLog(
  oldMessage: Message | PartialMessage,
  newMessage: Message | PartialMessage,
) {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return; // ignore non-content edits
  const ctx = await resolveContext(newMessage.guild, "messageEdit");
  if (!ctx) return;
  if (channelExempt(ctx.log, newMessage.channelId) || memberExempt(ctx.log, newMessage.member)) {
    return;
  }

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

  await ctx.channel.send({ embeds: [embed] }).catch(() => {});
}

export async function onMemberJoinLog(member: GuildMember) {
  const ctx = await resolveContext(member.guild, "memberJoin");
  if (!ctx || memberExempt(ctx.log, member)) return;

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

  await ctx.channel.send({ embeds: [embed] }).catch(() => {});
}

export async function onMemberLeaveLog(member: GuildMember | PartialGuildMember) {
  const ctx = await resolveContext(member.guild, "memberLeave");
  if (!ctx || memberExempt(ctx.log, member)) return;

  const name = member.user?.username ? `${member.user.username} ` : "";
  const embed = new EmbedBuilder()
    .setTitle("📤 Użytkownik wyszedł")
    .setColor(0x6b7280)
    .setDescription(`${name}<@${member.id}> \`${member.id}\``)
    .setTimestamp();

  await ctx.channel.send({ embeds: [embed] }).catch(() => {});
}

export async function onGuildMemberUpdateLog(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
) {
  const guild = newMember.guild;

  if (oldMember.nickname !== newMember.nickname) {
    const ctx = await resolveContext(guild, "nicknameChanges");
    if (ctx && !memberExempt(ctx.log, newMember)) {
      const embed = new EmbedBuilder()
        .setTitle("✏️ Zmiana pseudonimu")
        .setColor(0x6366f1)
        .setDescription(`${newMember} \`${newMember.id}\``)
        .addFields(
          { name: "Przed", value: oldMember.nickname ?? "(brak)", inline: true },
          { name: "Po", value: newMember.nickname ?? "(brak)", inline: true },
        )
        .setTimestamp();
      await ctx.channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  const oldRoles = oldMember.roles?.cache;
  if (oldRoles) {
    const newRoles = newMember.roles.cache;
    const added = newRoles.filter((r) => !oldRoles.has(r.id));
    const removed = oldRoles.filter((r) => !newRoles.has(r.id));
    if (added.size || removed.size) {
      const ctx = await resolveContext(guild, "roleChanges");
      if (ctx && !memberExempt(ctx.log, newMember)) {
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
        await ctx.channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  }
}
