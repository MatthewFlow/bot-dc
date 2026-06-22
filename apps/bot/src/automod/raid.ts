import { EmbedBuilder, type Guild, type GuildMember } from "discord.js";

import { sendModLog } from "../modlog";
import { getCachedGuildConfig } from "../utils/configCache";

// Sanity cap na okno (raidWindowSeconds clampowane do 300 s w sanitize).
const RAID_MAX_WINDOW_MS = 5 * 60_000;

/**
 * Okno detekcji w ms: min. 2 s, maks. {@link RAID_MAX_WINDOW_MS}. Eksportowane,
 * by przetestować granice clampu (defensywnie wobec wartości spoza sanitize).
 */
export function raidWindowMs(raidWindowSeconds?: number): number {
  return Math.min(Math.max(2, raidWindowSeconds ?? 10) * 1000, RAID_MAX_WINDOW_MS);
}

/** Próg wejść: min. 2 (domyślnie 10). Eksportowane na potrzeby testów. */
export function raidThreshold(raidJoinCount?: number): number {
  return Math.max(2, raidJoinCount ?? 10);
}

type Join = { at: number; member: GuildMember };
// guildId -> ostatnie wejścia w oknie; guildId -> czas ostatniego alertu (cooldown).
const joins = new Map<string, Join[]>();
const lastAlert = new Map<string, number>();

async function postRaidAlert(
  guild: Guild,
  channelId: string,
  count: number,
  windowSec: number,
  action: "alert" | "kick" | "ban",
): Promise<void> {
  const channel =
    guild.channels.cache.get(channelId) ??
    (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

  const reaction =
    action === "kick"
      ? "wyrzucam świeże wejścia"
      : action === "ban"
        ? "banuję świeże wejścia"
        : "tylko alert";

  const embed = new EmbedBuilder()
    .setTitle("🚨 Możliwy raid")
    .setColor(0xef4444)
    .setDescription(
      `Wykryto **${count}** wejść w ciągu **${windowSec}s**.\nReakcja: ${reaction}.`,
    )
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function applyRaidAction(
  member: GuildMember,
  action: "kick" | "ban",
): Promise<void> {
  const guild = member.guild;
  const botUser = guild.client.user;
  if (!botUser) return;
  const reason = "Auto-moderacja: raid";
  try {
    if (action === "ban") {
      await guild.members.ban(member.id, { reason });
      await sendModLog(guild, "ban", member.user, botUser, reason, "Raid").catch(
        () => {},
      );
    } else {
      await member.kick(reason);
      await sendModLog(guild, "kick", member.user, botUser, reason, "Raid").catch(
        () => {},
      );
    }
  } catch {
    // Hierarchia/uprawnienia — pomijamy pojedyncze błędy.
  }
}

/**
 * Wykrywa raid: N wejść w oknie T sekund. Przy wykryciu wysyła alert na kanał
 * mod-logów (z cooldownem) i — jeśli skonfigurowano — wyrzuca/banuje świeże wejścia.
 * Wołane na evencie `guildMemberAdd`; nigdy nie rzuca.
 */
export async function checkRaid(member: GuildMember): Promise<void> {
  if (member.user.bot) return;

  const cfg = await getCachedGuildConfig(member.guild.id);
  if (!cfg?.autoMod?.enabled || !cfg.autoMod.raidEnabled) return;
  const am = cfg.autoMod;

  const guildId = member.guild.id;
  const now = Date.now();
  const windowMs = raidWindowMs(am.raidWindowSeconds);
  const threshold = raidThreshold(am.raidJoinCount);

  const recent = (joins.get(guildId) ?? []).filter((j) => now - j.at < windowMs);
  recent.push({ at: now, member });
  joins.set(guildId, recent);

  if (recent.length < threshold) return;

  const action = am.raidAction ?? "alert";

  // Alert raz na okno (cooldown), na kanał mod-logów jeśli ustawiony.
  const last = lastAlert.get(guildId) ?? 0;
  if (now - last > windowMs && cfg.modLogChannelId) {
    lastAlert.set(guildId, now);
    await postRaidAlert(
      member.guild,
      cfg.modLogChannelId,
      recent.length,
      Math.round(windowMs / 1000),
      action,
    ).catch(() => {});
  }

  if (action === "alert") return;

  // Akcja na świeżych wejściach z okna; czyścimy okno, by nie działać dwa razy.
  const targets = recent.map((j) => j.member);
  joins.set(guildId, []);
  for (const m of targets) {
    await applyRaidAction(m, action);
  }
}
