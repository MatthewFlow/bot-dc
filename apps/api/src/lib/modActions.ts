import type { GuildConfig, ModActionType } from "@jurassic-haven/db";
import { modActionRepository } from "@jurassic-haven/db";

import { botHeaders, discordFetch } from "./discord";

/** Etykieta + kolor embeda per typ akcji — spójne z bot-owym `modlog.ts`. */
const ACTION_META: Record<ModActionType, { label: string; color: number }> = {
  warn: { label: "Ostrzeżenie", color: 0xf59e0b },
  mute: { label: "Wyciszenie", color: 0x6366f1 },
  unmute: { label: "Odciszenie", color: 0x22c55e },
  kick: { label: "Wyrzucenie", color: 0xef4444 },
  ban: { label: "Ban", color: 0x7f1d1d },
  unban: { label: "Odbanowanie", color: 0x22c55e },
  clearwarns: { label: "Wyczyszczenie ostrzeżeń", color: 0x6b7280 },
};

/** Krótki komunikat DM dla karanego użytkownika (gdy serwer ma włączone `dmOnPunish`). */
const DM_MESSAGE: Partial<Record<ModActionType, string>> = {
  warn: "otrzymałeś ostrzeżenie",
  mute: "zostałeś wyciszony",
  kick: "zostałeś wyrzucony",
  ban: "zostałeś zbanowany",
};

export type LogModActionOpts = {
  guildId: string;
  type: ModActionType;
  /** Ukarany użytkownik. */
  userId: string;
  /** Moderator — tu użytkownik panelu. */
  moderatorId: string;
  reason: string;
  extra?: string;
  botToken: string;
  /** Konfiguracja serwera (przekazana, by uniknąć powtórnego odczytu z bazy). */
  cfg: GuildConfig | null;
};

/**
 * Zapisuje akcję moderacyjną do trwałego audytu (ZAWSZE) i — gdy kanał logów jest
 * ustawiony — wysyła embed na ten kanał. Odpowiednik bot-owego `sendModLog`, tyle że
 * z poziomu API (moderatorem jest użytkownik panelu). Best-effort: błąd embeda nie
 * przerywa akcji ani nie cofa zapisu audytu.
 */
export async function logModAction(opts: LogModActionOpts): Promise<void> {
  const { guildId, type, userId, moderatorId, reason, extra, botToken, cfg } = opts;

  await modActionRepository
    .add({ guildId, type, userId, moderatorId, reason, extra })
    .catch((e) =>
      console.error("[modActions] Nie udało się zapisać akcji do audytu:", e),
    );

  if (!cfg?.modLogChannelId) return;

  const meta = ACTION_META[type];
  const fields = [
    { name: "Użytkownik", value: `<@${userId}> \`${userId}\``, inline: true },
    { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
    { name: "Powód", value: reason.slice(0, 1024) },
  ];
  if (extra) fields.push({ name: "Szczegóły", value: extra.slice(0, 1024) });

  await discordFetch(`/channels/${cfg.modLogChannelId}/messages`, {
    method: "POST",
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      embeds: [
        {
          title: `${meta.label} (z panelu)`,
          color: meta.color,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch(() => {});
}

/** Otwiera (lub zwraca istniejący) kanał DM z użytkownikiem. `null` przy błędzie. */
async function openDmChannel(userId: string, botToken: string): Promise<string | null> {
  const res = await discordFetch(`/users/@me/channels`, {
    method: "POST",
    headers: botHeaders(botToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({ recipient_id: userId }),
  });
  if (!res || !res.ok) return null;
  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return data?.id ?? null;
}

/**
 * Wysyła karanemu użytkownikowi DM z informacją o karze. Best-effort — użytkownik mógł
 * mieć zablokowane wiadomości. Dla `kick`/`ban` wołaj PRZED usunięciem z serwera, bo po
 * akcji bot i użytkownik nie dzielą już wspólnego serwera i DM się nie dostarczy.
 */
export async function sendPunishDm(opts: {
  userId: string;
  guildName: string;
  type: ModActionType;
  reason: string;
  detail?: string;
  botToken: string;
}): Promise<void> {
  const message = DM_MESSAGE[opts.type];
  if (!message) return;

  const channelId = await openDmChannel(opts.userId, opts.botToken);
  if (!channelId) return;

  const where = opts.guildName ? `Na serwerze **${opts.guildName}**` : "Na serwerze";
  const lines = [`${where} ${message}.`];
  if (opts.detail) lines.push(opts.detail);
  lines.push(`**Powód:** ${opts.reason}`);

  await discordFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    headers: botHeaders(opts.botToken, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      embeds: [
        {
          title: ACTION_META[opts.type].label,
          color: ACTION_META[opts.type].color,
          description: lines.join("\n"),
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch(() => {});
}
