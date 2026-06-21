import { messageXpFor, XP_COOLDOWN_MS, xpRepository } from "@jurassic-haven/db";
import type { Message } from "discord.js";

import { runAutoMod } from "../automod/automod";
import { handlePrefixCommand } from "../commands/prefix";
import { applyLevelProgress } from "../levels/award";
import { getCachedGuildConfig } from "../utils/configCache";
import { isModuleEnabled } from "../utils/modules";

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

  // Komendy prefiksowe (klasyczne) — gdy obsłużone, nie naliczamy XP za nie.
  if (cfg && (await handlePrefixCommand(message, cfg))) return;

  // Moduł leveling wyłączony na serwerze → bez XP/level-upów.
  if (!isModuleEnabled(cfg, "leveling")) return;

  const lvl = cfg?.leveling;

  // No-XP channels / roles.
  if (lvl?.noXpChannelIds?.includes(message.channelId)) return;
  if (lvl?.noXpRoleIds?.some((id) => member.roles.cache.has(id))) return;

  // Płaskie XP za wiadomość (0–8); 0 = wyłączone. Legacy `xpMultiplier` jako fallback.
  const amount = messageXpFor(lvl);
  if (amount <= 0) return;

  const res = await xpRepository.addXpWithCooldown({
    guildId: message.guild.id,
    userId: message.author.id,
    now: Date.now(),
    amount,
    cooldownMs: XP_COOLDOWN_MS,
  });

  if (res.gained <= 0) return;

  await applyLevelProgress(member, res, cfg);
}
