import type { AddXpResult, GuildConfig } from "@jurassic-haven/db";
import { activityEventRepository } from "@jurassic-haven/db";
import type { GuildMember } from "discord.js";

import { applyAutoRole } from "./autorole";
import { notifyLevelUp } from "./levelUpNotify";

/**
 * Wspólna obsługa skutków zdobycia XP (wiadomość/głos): nadanie roli za level
 * i powiadomienie o awansie. Wywoływać po `addXp*`, gdy `res.gained > 0`.
 */
export async function applyLevelProgress(
  member: GuildMember,
  res: AddXpResult,
  cfg: GuildConfig | null,
): Promise<void> {
  const granted = await applyAutoRole(member, res.newLevel).catch(() => null);

  // Dziennik aktywności: nadanie roli-nagrody logujemy tylko z tej (organicznej)
  // ścieżki — masowe synchronizacje wołają `applyAutoRole` bezpośrednio i nie logują.
  if (granted) {
    await activityEventRepository
      .add({
        guildId: member.guild.id,
        type: "role",
        userId: member.id,
        roleId: granted.roleId,
        roleName: granted.roleName,
      })
      .catch(() => {});
  }

  if (res.newLevel <= res.oldLevel) return;

  // Awans — zapisujemy niezależnie od ustawień powiadomień.
  await activityEventRepository
    .add({
      guildId: member.guild.id,
      type: "levelup",
      userId: member.id,
      level: res.newLevel,
    })
    .catch(() => {});

  const lvl = cfg?.leveling;
  const channelOn = lvl?.levelUpEnabled !== false; // domyślnie włączone
  const dm = lvl?.levelUpDm === true;
  if (!channelOn && !dm) return;

  const target = cfg?.roleRewards
    ?.slice()
    .sort((a, b) => a.level - b.level)
    .filter((r) => r.level <= res.newLevel)
    .at(-1);

  await notifyLevelUp(member, res.newLevel, target ? `<@&${target.roleId}>` : undefined, {
    dm,
    suppressChannel: !channelOn,
  });
}
