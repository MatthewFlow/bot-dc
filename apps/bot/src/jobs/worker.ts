import {
  type BotJob,
  botJobRepository,
  type JobRecurrence,
  toDiscordEmbed,
} from "@jurassic-haven/db";
import type { Client } from "discord.js";

/** Co ile worker sprawdza zaległe zadania. */
const WORKER_INTERVAL_MS = 30_000;
/** Ile zadań naraz bierzemy z kolejki w jednym przebiegu. */
const BATCH = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Następny termin zadania cyklicznego — przeskakuje pominięte przebiegi (catch-up). */
function nextRun(from: Date, recurrence: JobRecurrence): Date {
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

async function tick(client: Client): Promise<void> {
  const due = await botJobRepository.getDue(new Date(), BATCH).catch(() => []);
  for (const job of due) {
    try {
      if (job.type === "sendEmbed") await runSendEmbed(client, job);

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
