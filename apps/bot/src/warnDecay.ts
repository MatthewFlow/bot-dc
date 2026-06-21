import { guildConfigRepository, warnRepository } from "@jurassic-haven/db";
import type { Client } from "discord.js";

/** Co ile sprawdzamy wygasłe ostrzeżenia (decay nie musi być natychmiastowy). */
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 h

/** Usuwa ostrzeżenia starsze niż `warnDecayDays` na każdym serwerze, który to włączył. */
async function sweep(client: Client): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    const cfg = await guildConfigRepository.get(guild.id).catch(() => null);
    const days = cfg?.warnDecayDays ?? 0;
    if (days <= 0) continue;

    const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await warnRepository.deleteOlderThan(guild.id, before).catch(() => {});
  }
}

/** Uruchamia okresowe wygasanie ostrzeżeń. Audyt (modAction „warn") pozostaje nienaruszony. */
export function startWarnDecay(client: Client): void {
  void sweep(client);
  setInterval(() => void sweep(client), SWEEP_INTERVAL_MS).unref?.();
}
