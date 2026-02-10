import type { Message } from "discord.js";

import { getConfig } from "../config/store";
import { applyAutoRole } from "../levels/autorole";
import { addXpWithCooldown } from "../levels/store";
import { isAllowedTextChannel } from "../utils/channels";

export async function onMessageCreate(message: Message) {
  if (!message.guild) return;
  if (message.author.bot) return;

  const member = message.member;
  if (!member) return;

  const res = addXpWithCooldown({
    guildId: message.guild.id,
    userId: message.author.id,
    now: Date.now(),
    amount: 15,
    cooldownMs: 5_000,
  });

  // jeśli nie dostał XP (cooldown) – nic nie rób
  if (res.gained <= 0) return;

  // auto-role odpalamy zawsze po przyznaniu XP
  await applyAutoRole(member, res.newLevel).catch(() => {});

  // ===== LEVEL UP NOTIFY (tylko gdy awansował) =====
  if (res.newLevel > res.oldLevel) {
    const channelId = process.env.LEVEL_UP_CHANNEL_ID;
    if (!channelId) return;

    const ch = message.guild.channels.cache.get(channelId);
    if (!isAllowedTextChannel(ch)) return;

    // znajdź docelową rolę dla nowego levelu (żeby pokazać w wiadomości)
    const cfg = getConfig(message.guild.id);
    const rewards = cfg?.roleRewards ?? [];

    const target = rewards
      .slice()
      .sort((a, b) => a.level - b.level)
      .filter((r) => r.level <= res.newLevel)
      .at(-1);

    const roleLine = target ? `\nNowa ranga: <@&${target.roleId}>` : "";

    await ch
      .send(`📈 ${member} wbił **level ${res.newLevel}** 🎉` + roleLine)
      .catch(() => {});
  }
}
