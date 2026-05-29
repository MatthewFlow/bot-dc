import { guildConfigRepository } from "@jurassic-haven/db";
import type { GuildMember } from "discord.js";

export async function applyAutoRole(member: GuildMember, level: number) {
  const cfg = await guildConfigRepository.get(member.guild.id);
  const rewards = cfg?.roleRewards ?? [];
  if (rewards.length === 0) return;

  const sorted = [...rewards].sort((a, b) => a.level - b.level);
  const eligible = sorted.filter((r) => r.level <= level);
  if (eligible.length === 0) return;

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
    } catch (e) {
      console.error(
        `[autorole] Nie udało się nadać roli ${target.roleId} dla ${member.user.username}:`,
        e,
      );
    }
  }
}
