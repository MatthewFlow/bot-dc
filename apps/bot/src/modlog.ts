import type { ModActionType } from "@jurassic-haven/db";
import { guildConfigRepository, modActionRepository } from "@jurassic-haven/db";
import { EmbedBuilder, type Guild, type User } from "discord.js";

const ACTION_LABELS: Record<ModActionType, string> = {
  warn: "Ostrzeżenie",
  mute: "Timeout",
  unmute: "Unmute",
  kick: "Kick",
  ban: "Ban",
  clearwarns: "Wyczyszczenie ostrzeżeń",
};

const ACTION_COLORS: Record<ModActionType, number> = {
  warn: 0xf59e0b,
  mute: 0x6366f1,
  unmute: 0x22c55e,
  kick: 0xef4444,
  ban: 0x7f1d1d,
  clearwarns: 0x6b7280,
};

/**
 * Zapisuje akcję moderacyjną do trwałego audytu (ZAWSZE — niezależnie od tego
 * czy kanał logów jest skonfigurowany) i dodatkowo wysyła embed na kanał logów,
 * o ile został ustawiony.
 */
export async function sendModLog(
  guild: Guild,
  action: ModActionType,
  target: User,
  moderator: User,
  reason: string,
  extra?: string,
) {
  await modActionRepository
    .add({
      guildId: guild.id,
      type: action,
      userId: target.id,
      moderatorId: moderator.id,
      reason,
      extra,
    })
    .catch((e) => console.error("[modlog] Nie udało się zapisać akcji do audytu:", e));

  const cfg = await guildConfigRepository.get(guild.id);
  if (!cfg?.modLogChannelId) return;

  const channel =
    guild.channels.cache.get(cfg.modLogChannelId) ??
    (await guild.channels.fetch(cfg.modLogChannelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  const embed = new EmbedBuilder()
    .setTitle(ACTION_LABELS[action])
    .setColor(ACTION_COLORS[action])
    .addFields(
      { name: "Użytkownik", value: `${target} \`${target.id}\``, inline: true },
      { name: "Moderator", value: `${moderator}`, inline: true },
      { name: "Powód", value: reason.slice(0, 1024) },
    )
    .setThumbnail(target.displayAvatarURL())
    .setTimestamp();

  if (extra) {
    embed.addFields({ name: "Szczegóły", value: extra.slice(0, 1024) });
  }

  await channel.send({ embeds: [embed] }).catch(() => {});
}
