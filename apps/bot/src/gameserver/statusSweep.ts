import { gameServerStatusRepository } from "@jurassic-haven/db";

import { getRcon } from "./manager";

/** Jak często bot odpytuje serwer gry i zapisuje migawkę. */
const SWEEP_MS = 30_000;

async function sweep(): Promise<void> {
  const rcon = getRcon();
  if (!rcon) return;
  try {
    const players = await rcon.getPlayers();
    const status = await rcon.getStatus();
    await gameServerStatusRepository.set({
      online: status.online,
      name: status.name ?? null,
      map: status.map ?? null,
      version: status.version ?? null,
      players: players.length,
      maxPlayers: status.maxPlayers,
      dinos: status.dinos,
      playerList: players,
    });
  } catch {
    // Serwer nieosiągalny — zapisujemy „offline", żeby panel to pokazał.
    await gameServerStatusRepository
      .set({ online: false, players: 0, maxPlayers: 0, dinos: [], playerList: [] })
      .catch(() => {});
  }
}

/** Uruchamia cykliczny zapis migawki serwera gry — tylko gdy RCON skonfigurowany. */
export function startGameStatusSweep(): void {
  if (!getRcon()) return;
  void sweep();
  setInterval(() => void sweep(), SWEEP_MS).unref?.();
}
