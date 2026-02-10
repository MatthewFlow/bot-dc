import type { GuildMember } from "discord.js";

import { getConfig } from "../config/store";

export async function applyAutoRole(member: GuildMember, level: number) {
  const cfg = getConfig(member.guild.id);
  const rewards = cfg?.roleRewards ?? [];
  if (rewards.length === 0) return;

  // sortujemy progi rosnąco
  const sorted = [...rewards].sort((a, b) => a.level - b.level);

  // bierzemy najwyższy próg <= aktualny level
  const eligible = sorted.filter((r) => r.level <= level);
  if (eligible.length === 0) return;

  const target = eligible.at(-1);
  if (!target) return;

  // wszystkie role progresji (do zdejmowania)
  const rewardRoleIds = new Set(sorted.map((r) => r.roleId));

  // role progresji, które user MA, ale nie są docelowe
  const rolesToRemove = member.roles.cache
    .filter((r) => rewardRoleIds.has(r.id) && r.id !== target.roleId)
    .map((r) => r.id);

  // zdejmujemy stare role progresji
  if (rolesToRemove.length > 0) {
    await member.roles.remove(rolesToRemove).catch(() => {});
  }

  // nadajemy docelową rolę, jeśli jej jeszcze nie ma
  if (!member.roles.cache.has(target.roleId)) {
    await member.roles.add(target.roleId).catch(() => {});
  }
}
