import { guildConfigRepository } from "@jurassic-haven/db";
import type { GuildMember } from "discord.js";

/** Nadana rola-nagroda (do dziennika aktywności), gdy faktycznie doszło do nadania. */
export type GrantedReward = { roleId: string; roleName?: string };

/**
 * Synchronizuje rolę-nagrodę za poziom. Zwraca nadaną rolę, gdy faktycznie ją dodano
 * (a nie tylko potwierdzono) — dzięki temu zapis do dziennika aktywności robi tylko
 * organiczna ścieżka level-upu, a masowe synchronizacje (admin) feedu nie zalewają.
 */
export async function applyAutoRole(
  member: GuildMember,
  level: number,
): Promise<GrantedReward | null> {
  const cfg = await guildConfigRepository.get(member.guild.id);
  const rewards = cfg?.roleRewards ?? [];
  if (rewards.length === 0) return null;

  const sorted = [...rewards].sort((a, b) => a.level - b.level);
  const eligible = sorted.filter((r) => r.level <= level);
  if (eligible.length === 0) return null;

  const target = eligible.at(-1)!;
  const rewardRoleIds = new Set(sorted.map((r) => r.roleId));

  const rolesToRemove = member.roles.cache
    .filter((r) => rewardRoleIds.has(r.id) && r.id !== target.roleId)
    .map((r) => r.id);

  if (rolesToRemove.length > 0) {
    try {
      await member.roles.remove(rolesToRemove);
    } catch (e) {
      console.error(
        `[autorole] Nie udało się usunąć ról dla ${member.user.username}:`,
        e,
      );
    }
  }

  if (!member.roles.cache.has(target.roleId)) {
    try {
      await member.roles.add(target.roleId);
      return {
        roleId: target.roleId,
        roleName: member.guild.roles.cache.get(target.roleId)?.name,
      };
    } catch (e) {
      console.error(
        `[autorole] Nie udało się nadać roli ${target.roleId} dla ${member.user.username}:`,
        e,
      );
    }
  }
  return null;
}
