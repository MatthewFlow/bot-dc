import {
  type BotJob,
  botJobRepository,
  type JobRecurrence,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import type { Client } from "discord.js";

import { getRcon } from "../gameserver/manager";
import { sendModLog } from "../modlog";

/** Co ile worker sprawdza zaległe zadania. */
const WORKER_INTERVAL_MS = 30_000;
/** Ile zadań naraz bierzemy z kolejki w jednym przebiegu. */
const BATCH = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Następny termin zadania cyklicznego — przeskakuje pominięte przebiegi (catch-up).
 * Eksportowane na potrzeby testów jednostkowych.
 */
export function nextRun(from: Date, recurrence: JobRecurrence): Date {
  const step = recurrence === "weekly" ? 7 * DAY_MS : DAY_MS;
  let next = from.getTime() + step;
  const now = Date.now();
  while (next <= now) next += step;
  return new Date(next);
}

/** Wykonanie zadania `sendEmbed`: publikuje embed na wskazanym kanale. */
async function runSendEmbed(client: Client, job: BotJob): Promise<void> {
  if (!job.channelId || !job.embed) throw new Error("brak kanału lub embeda");
  const channel = await client.channels.fetch(job.channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    throw new Error("kanał niedostępny");
  }
  await channel.send({ embeds: [toDiscordEmbed(job.embed)] });
}

/** Wykonanie zadania `unban`: zdejmuje bana (koniec temp-bana) i loguje akcję. */
async function runUnban(client: Client, job: BotJob): Promise<void> {
  if (!job.userId) throw new Error("brak userId");
  const guild = await client.guilds.fetch(job.guildId).catch(() => null);
  if (!guild) throw new Error("serwer niedostępny");

  await guild.bans.remove(job.userId, "Koniec tymczasowego bana");

  const botUser = client.user;
  const user = await client.users.fetch(job.userId).catch(() => null);
  if (botUser && user) {
    await sendModLog(
      guild,
      "unban",
      user,
      botUser,
      "Koniec tymczasowego bana",
      "Auto",
    ).catch(() => {});
  }
}

/** Wykonanie zadania `gameAnnounce`: ogłoszenie in-game przez RCON serwera gry. */
async function runGameAnnounce(job: BotJob): Promise<void> {
  if (!job.text) throw new Error("brak treści ogłoszenia");
  const rcon = getRcon();
  if (!rcon) throw new Error("RCON serwera gry nie jest skonfigurowany");
  await rcon.announce(job.text);
}

async function tick(client: Client): Promise<void> {
  const due = await botJobRepository.getDue(new Date(), BATCH).catch(() => []);
  for (const job of due) {
    try {
      if (job.type === "sendEmbed") await runSendEmbed(client, job);
      else if (job.type === "unban") await runUnban(client, job);
      else if (job.type === "gameAnnounce") await runGameAnnounce(job);

      if (job.recurrence === "once") await botJobRepository.markDone(job.id);
      else
        await botJobRepository.reschedule(
          job.id,
          nextRun(job.runAt, job.recurrence),
          new Date(),
        );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "nieznany błąd";
      console.error(`[jobs] zadanie ${job.id} (${job.type}) — błąd:`, msg);
      // Jednorazowe zatrzymujemy z błędem; cykliczne przesuwamy na następny termin.
      if (job.recurrence === "once") await botJobRepository.markError(job.id, msg);
      else
        await botJobRepository.reschedule(
          job.id,
          nextRun(job.runAt, job.recurrence),
          new Date(),
        );
    }
  }
}

/** Uruchamia worker kolejki zadań bot↔panel. */
export function startJobWorker(client: Client): void {
  void tick(client);
  setInterval(() => void tick(client), WORKER_INTERVAL_MS).unref?.();
}
