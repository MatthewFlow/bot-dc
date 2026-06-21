import { type AutoModConfig, warnRepository } from "@jurassic-haven/db";
import { type Message, PermissionFlagsBits } from "discord.js";

import { sendModLog } from "../modlog";

const INVITE_RE = /(discord\.(gg|io|me|li)|discord(?:app)?\.com\/invite)\/\S+/i;
const LINK_RE = /https?:\/\/\S+/i;

// In-memory spam tracker: key `${guildId}:${userId}` -> recent message timestamps.
const spamHits = new Map<string, number[]>();

// Najdłuższe sensowne okno anty-spamu (spamWindowSeconds jest clampowane do 60 s).
const SPAM_MAX_WINDOW_MS = 60_000;

/**
 * Okresowo usuwa wpisy anty-spamu nieaktywne dłużej niż okno — bez tego mapa
 * rosłaby z każdym nowym `guild:user`. Wołane raz przy starcie bota; `unref`,
 * by nie blokować zamknięcia procesu.
 */
export function startAutoModSweep(): () => void {
  const timer = setInterval(() => {
    const cutoff = Date.now() - SPAM_MAX_WINDOW_MS;
    for (const [k, hits] of spamHits) {
      const last = hits.at(-1);
      if (last === undefined || last < cutoff) spamHits.delete(k);
    }
  }, SPAM_MAX_WINDOW_MS);
  timer.unref?.();
  return () => clearInterval(timer);
}

function isExempt(message: Message, cfg: AutoModConfig): boolean {
  const member = message.member;
  if (!member) return true;
  // Staff who can manage messages / the server are never auto-moderated.
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  ) {
    return true;
  }
  if (cfg.exemptChannelIds.includes(message.channelId)) return true;
  if (cfg.exemptRoleIds.some((id) => member.roles.cache.has(id))) return true;
  return false;
}

function detectViolation(message: Message, cfg: AutoModConfig): string | null {
  const content = message.content;

  if (cfg.blockInvites && INVITE_RE.test(content)) return "zaproszenie Discord";
  if (cfg.blockLinks && LINK_RE.test(content)) return "link";

  if (cfg.bannedWords.length) {
    const lower = content.toLowerCase();
    for (const word of cfg.bannedWords) {
      const w = word.trim().toLowerCase();
      if (w && lower.includes(w)) return "niedozwolone słowo";
    }
  }

  // Masowe oznaczenia: @everyone/@here lub więcej niż próg oznaczeń użytkowników/ról.
  if (cfg.blockMassMention) {
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    if (message.mentions.everyone || mentions > (cfg.maxMentions ?? 5)) {
      return "masowe oznaczenia";
    }
  }

  // CAPS: wiadomość pisana głównie WIELKIMI literami (pomijamy krótkie).
  if (cfg.blockCaps) {
    const letters = content.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, "");
    const upper = content.replace(/[^A-ZĄĆĘŁŃÓŚŹŻ]/g, "").length;
    if (letters.length >= 10 && upper / letters.length > 0.7) {
      return "nadmiar wielkich liter";
    }
  }

  // Powtarzanie tego samego znaku (np. „aaaaaaaaaa", „!!!!!!!!!!").
  if (cfg.blockRepeated && /(.)\1{9,}/.test(content)) return "powtarzanie znaków";

  if (cfg.spamEnabled && message.guild) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const windowMs = Math.max(1, cfg.spamWindowSeconds) * 1000;
    const hits = (spamHits.get(key) ?? []).filter((t) => now - t < windowMs);
    hits.push(now);
    spamHits.set(key, hits);
    if (hits.length > Math.max(1, cfg.spamMaxMessages)) return "spam";
  }

  return null;
}

/**
 * Runs auto-moderation on a message. Returns true if a violation was handled
 * (message removed) so the caller can skip awarding XP. Exempts staff and
 * configured roles/channels; never throws.
 */
export async function runAutoMod(message: Message, cfg: AutoModConfig): Promise<boolean> {
  if (!cfg.enabled || !message.guild || message.author.bot) return false;
  if (isExempt(message, cfg)) return false;

  const reason = detectViolation(message, cfg);
  if (!reason) return false;

  const fullReason = `Auto-moderacja: ${reason}`;

  // Remove the offending message (best-effort).
  await message.delete().catch(() => {});

  const botUser = message.client.user;
  const member = message.member;

  if (cfg.action === "warn" && botUser) {
    await warnRepository
      .add({
        guildId: message.guild.id,
        userId: message.author.id,
        moderatorId: botUser.id,
        reason: fullReason,
      })
      .catch(() => {});
    await sendModLog(message.guild, "warn", message.author, botUser, fullReason).catch(
      () => {},
    );
  } else if (cfg.action === "mute" && botUser && member) {
    const ms = Math.max(1, cfg.muteDurationSeconds) * 1000;
    await member.timeout(ms, fullReason).catch(() => {});
    await sendModLog(
      message.guild,
      "mute",
      message.author,
      botUser,
      fullReason,
      `${cfg.muteDurationSeconds}s`,
    ).catch(() => {});
  }

  return true;
}
