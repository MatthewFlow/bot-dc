/**
 * Kontrakt klienta RCON dla serwera gry The Isle: Evrima.
 *
 * Tu żyją tylko typy + interfejs. Implementacja: `evrimaClient.ts`
 * (transport + protokół), konfiguracja z env: `config.ts`. Patrz `docs/rcon-evrima.md`.
 */

/** Pojedynczy gracz na serwerze gry. */
export type PlayerInfo = {
  /** Stabilny identyfikator gracza (np. Steam/EOS id). */
  id: string;
  name: string;
  /** Wybrany dinozaur (jeśli serwer go zwraca). */
  dino?: string;
  /** Czas na serwerze w sekundach (jeśli dostępny). */
  playtimeSec?: number;
};

/** Migawka stanu serwera gry. */
export type ServerStatus = {
  online: boolean;
  name?: string;
  map?: string;
  players: number;
  maxPlayers: number;
  /** Uptime serwera w sekundach (jeśli dostępny). */
  uptimeSec?: number;
};

/** Dane połączenia RCON (z env: RCON_HOST/PORT/PASSWORD). */
export type RconConfig = {
  host: string;
  port: number;
  password: string;
};

/**
 * Operacje na serwerze gry przez RCON. Implementacja trzyma warstwę komend w jednym
 * miejscu, żeby patch Evrimy dotykał tylko tego pliku.
 */
export interface RconClient {
  getStatus(): Promise<ServerStatus>;
  getPlayers(): Promise<PlayerInfo[]>;
  announce(message: string): Promise<void>;
  kick(playerId: string, reason?: string): Promise<void>;
  ban(playerId: string, reason?: string): Promise<void>;
  /** Zapis świata. */
  save(): Promise<void>;
  /** Ucieczkowy kanał — surowa komenda RCON spoza powyższego API. */
  raw(command: string): Promise<string>;
  /** Zamyka połączenie. */
  close(): Promise<void>;
}
