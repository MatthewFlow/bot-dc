import { XP_COOLDOWN_MS, XP_PER_MESSAGE, xpRepository } from "@jurassic-haven/db";
import type { Message } from "discord.js";

import { runAutoMod } from "../automod/automod";
import { applyAutoRole } from "../levels/autorole";
import { notifyLevelUp } from "../levels/levelUpNotify";
import { getCachedGuildConfig } from "../utils/configCache";

export async function onMessageCreate(message: Message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const member = message.member;
  if (!member) return;

  const cfg = await getCachedGuildConfig(message.guild.id);

  // Auto-moderation runs first — if it removes the message, skip XP.
  if (cfg?.autoMod) {
    const handled = await runAutoMod(message, cfg.autoMod);
    if (handled) return;
  }

  const lvl = cfg?.leveling;

  // No-XP channels / roles.
  if (lvl?.noXpChannelIds?.includes(message.channelId)) return;
  if (lvl?.noXpRoleIds?.some((id) => member.roles.cache.has(id))) return;

  const multiplier = lvl?.xpMultiplier && lvl.xpMultiplier > 0 ? lvl.xpMultiplier : 1;
  const amount = Math.max(1, Math.round(XP_PER_MESSAGE * multiplier));

  const res = await xpRepository.addXpWithCooldown({
    guildId: message.guild.id,
    userId: message.author.id,
    now: Date.now(),
    amount,
    cooldownMs: XP_COOLDOWN_MS,
  });

  if (res.gained <= 0) return;

  await applyAutoRole(member, res.newLevel).catch(() => {});

  if (res.newLevel > res.oldLevel) {
    const channelOn = lvl?.levelUpEnabled !== false; // default on
    const dm = lvl?.levelUpDm === true;

    if (channelOn || dm) {
      const target = cfg?.roleRewards
        ?.slice()
        .sort((a, b) => a.level - b.level)
        .filter((r) => r.level <= res.newLevel)
        .at(-1);

      await notifyLevelUp(
        member,
        res.newLevel,
        target ? `<@&${target.roleId}>` : undefined,
        {
          dm,
          suppressChannel: !channelOn,
        },
      );
    }
  }
}
