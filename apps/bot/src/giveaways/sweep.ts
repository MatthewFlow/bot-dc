import { giveawayRepository } from "@jurassic-haven/db";
import type { Client } from "discord.js";

import { endGiveaway } from "./draw";

/** Co ile sprawdzamy giveawaye do zakończenia. */
const INTERVAL_MS = 30_000;
/** Ile naraz kończymy w jednym przebiegu. */
const BATCH = 20;

async function tick(client: Client): Promise<void> {
  const due = await giveawayRepository.getDueActive(new Date(), BATCH).catch(() => []);
  for (const giveaway of due) {
    try {
      await endGiveaway(client, giveaway);
    } catch (e) {
      console.error(`[giveaways] zakończenie ${giveaway.id} — błąd:`, e);
    }
  }
}

/** Uruchamia okresowe auto-kończenie giveawayów po upływie czasu. */
export function startGiveawaySweep(client: Client): void {
  void tick(client);
  setInterval(() => void tick(client), INTERVAL_MS).unref?.();
}
