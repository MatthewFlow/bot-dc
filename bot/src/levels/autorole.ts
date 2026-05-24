import type { GuildMember } from "discord.js";

import { getConfig } from "../config/guildConfig";

export async function applyAutoRole(member: GuildMember, level: number) {
  const cfg = getConfig(member.guild.id);
  const rewards = cfg?.roleRewards ?? [];
  if (rewards.length === 0) return;

  const sorted = [...rewards].sort((a, b) => a.level - b.level);

  const eligible = sorted.filter((r) => r.level <= level);
  if (eligible.length === 0) return;

  // eligible jest niepusta — at(-1) zawsze zwraca wartość
  const target = eligible.at(-1)!;

  const rewardRoleIds = new Set(sorted.map((r) => r.roleId));

  const rolesToRemove = member.roles.cache
    .filter((r) => rewardRoleIds.has(r.id) && r.id !== target.roleId)
    .map((r) => r.id);

  if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove).catch(() => {});
  }

  if (!member.roles.cache.has(target.roleId)) {
    await member.roles.add(target.roleId).catch(() => {});
  }
}