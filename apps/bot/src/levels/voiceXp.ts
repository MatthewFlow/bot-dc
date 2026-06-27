import {
  clampSliderXp,
  clampVoiceInterval,
  type GuildConfig,
  VOICE_XP_INTERVAL_MS,
  xpRepository,
} from "@jurassic-haven/db";
import type { Client, GuildMember, VoiceState } from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";
import { isModuleEnabled } from "../utils/modules";
import { applyLevelProgress } from "./award";

// Licznik kolejnych „obecnych" ticków (minut) na osobę: `${guildId}:${userId}` → minuty.
// XP naliczamy co `voiceXpInterval` minut obecności (np. przy 5 → w 5., 10., 15. min…).
const ticks = new Map<string, number>();

const key = (guildId: string, userId: string) => `${guildId}:${userId}`;

/** Czy członek kwalifikuje się do XP za głos: pomijamy boty, AFK, wyciszonych/zagłuszonych i no-XP. */
function isEligible(
  member: GuildMember,
  vs: VoiceState,
  cfg: GuildConfig | null,
): boolean {
  if (member.user.bot) return false;

  const channel = vs.channel;
  if (!channel) return false;

  // Serwerowy kanał AFK.
  if (channel.id === member.guild.afkChannelId) return false;

  // Self-wyciszeni/zagłuszeni — traktujemy jak AFK na głosówce.
  if (vs.selfMute || vs.selfDeaf) return false;

  const lvl = cfg?.leveling;
  if (lvl?.noXpChannelIds?.includes(channel.id)) return false;
  if (lvl?.noXpRoleIds?.some((id) => member.roles.cache.has(id))) return false;

  return true;
}

async function grantVoiceXp(
  member: GuildMember,
  amount: number,
  cfg: GuildConfig | null,
) {
  const res = await xpRepository.addXp(member.guild.id, member.id, amount);
  if (res.gained <= 0) return;
  await applyLevelProgress(member, res, cfg);
}

/** Jeden przebieg: przyznaje XP wszystkim kwalifikującym się członkom na kanałach głosowych. */
async function sweep(client: Client) {
  // Zbieramy zapisy XP z całego przebiegu i odpalamy je równolegle na końcu —
  // seryjne `await` per członek serializowało zapisy do DB co minutę.
  const grants: Promise<void>[] = [];

  for (const guild of client.guilds.cache.values()) {
    const cfg = await getCachedGuildConfig(guild.id);
    if (!isModuleEnabled(cfg, "leveling")) continue;
    const voiceXp = clampSliderXp(cfg?.leveling?.voiceXp);
    const intervalMin = clampVoiceInterval(cfg?.leveling?.voiceXpInterval);

    const present = new Set<string>();

    for (const channel of guild.channels.cache.values()) {
      if (!channel.isVoiceBased()) continue;

      for (const member of channel.members.values()) {
        if (!isEligible(member, member.voice, cfg)) continue;

        const k = key(guild.id, member.id);
        present.add(k);
        const count = (ticks.get(k) ?? 0) + 1;
        ticks.set(k, count);

        // Nagroda co `intervalMin` minut obecności (np. przy 5 → w 5., 10., 15. min…).
        if (voiceXp > 0 && count % intervalMin === 0) {
          grants.push(grantVoiceXp(member, voiceXp, cfg).catch(() => {}));
        }
      }
    }

    // Sprzątanie: osoby, których już nie ma na głosówkach tego serwera, resetują licznik.
    for (const k of ticks.keys()) {
      if (k.startsWith(`${guild.id}:`) && !present.has(k)) ticks.delete(k);
    }
  }

  await Promise.all(grants);
}

/**
 * Uruchamia naliczanie XP za obecność na kanałach głosowych. Sweep co
 * {@link VOICE_XP_INTERVAL_MS} (1 minuta) zlicza obecność, a `leveling.voiceXp`
 * przyznaje co `leveling.voiceXpInterval` minut (5–60). Zwraca funkcję zatrzymującą.
 */
export function startVoiceXp(client: Client): () => void {
  const timer = setInterval(() => {
    void sweep(client).catch((e) => console.error("[voiceXp] błąd przebiegu:", e));
  }, VOICE_XP_INTERVAL_MS);

  // Nie blokuj zamykania procesu samym interwałem.
  timer.unref?.();

  return () => clearInterval(timer);
}
