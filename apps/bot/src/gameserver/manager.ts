import { getRconConfig } from "./config";
import { createEvrimaRconClient } from "./evrimaClient";
import type { RconClient } from "./rcon";

let client: RconClient | null | undefined;

/**
 * Zwraca współdzielony klient RCON (jedno połączenie z serwera gry) lub `null`,
 * gdy integracja nie jest skonfigurowana (brak RCON_* w env). Leniwa inicjalizacja.
 */
export function getRcon(): RconClient | null {
  if (client === undefined) {
    const config = getRconConfig();
    client = config ? createEvrimaRconClient(config) : null;
  }
  return client;
}

/** Czy integracja z serwerem gry jest w ogóle skonfigurowana (env). */
export function isGameServerConfigured(): boolean {
  return getRconConfig() !== null;
}
