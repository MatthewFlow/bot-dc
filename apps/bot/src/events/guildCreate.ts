import {
  ChannelType,
  EmbedBuilder,
  type Guild,
  PermissionFlagsBits,
} from "discord.js";

/**
 * Fired when the bot is added to a server. Logs the join and posts a short
 * getting-started message in a channel it can write to (best-effort).
 */
export async function onGuildCreate(guild: Guild) {
  console.log(
    `[guildCreate] Dodano bota do serwera: ${guild.name} (${guild.id}) — ${guild.memberCount} członków`,
  );

  const me = guild.members.me;
  if (!me) return;

  const canSend = (channelId: string | null | undefined) => {
    if (!channelId) return false;
    const ch = guild.channels.cache.get(channelId);
    return (
      ch?.type === ChannelType.GuildText &&
      ch.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)
    );
  };

  const channel =
    (canSend(guild.systemChannelId) ? guild.systemChannel : null) ??
    guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages),
    );

  if (!channel?.isTextBased()) return;

  const panelUrl = process.env.PANEL_URL;
  const embed = new EmbedBuilder()
    .setTitle("👋 Dzięki za dodanie Jurassic Haven!")
    .setColor(0xd4a843)
    .setDescription(
      "Skonfiguruj powitania, levele, role, moderację i tickety z panelu webowego." +
        (panelUrl ? `\n\n**Panel:** ${panelUrl}` : "") +
        "\n\nAdministratorzy serwera od razu mają dostęp do komend `/cfg_*`, `/mod_*` i `/ticket_*`.",
    );

  await channel.send({ embeds: [embed] }).catch(() => {});
}
