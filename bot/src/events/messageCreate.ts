import type { Message } from "discord.js";

import { XP_COOLDOWN_MS, XP_PER_MESSAGE } from "../config/xp";
import { guildConfigRepository, xpRepository } from "../db/providers/mongoose/providers";
import { applyAutoRole } from "../levels/autorole";
import { notifyLevelUp } from "../levels/levelUpNotify";

export async function onMessageCreate(message: Message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const member = message.member;
  if (!member) return;

  const res = await xpRepository.addXpWithCooldown({
    guildId: message.guild.id,
    userId: message.author.id,
    now: Date.now(),
    amount: XP_PER_MESSAGE,
    cooldownMs: XP_COOLDOWN_MS,
  });

  if (res.gained <= 0) return;

  await applyAutoRole(member, res.newLevel).catch(() => {});

  if (res.newLevel > res.oldLevel) {
    const cfg = await guildConfigRepository.get(message.guild.id);
    const target = cfg?.roleRewards
      ?.slice()
      .sort((a, b) => a.level - b.level)
      .filter((r) => r.level <= res.newLevel)
      .at(-1);

    await notifyLevelUp(
      member,
      res.newLevel,
      target ? `<@&${target.roleId}>` : undefined,
    );
  }
}
