import type { GamePlayer } from "../providers/mongoose/schemas/gameServerStatus.schema";

export type { GamePlayer };

export type GameServerSnapshot = {
  online: boolean;
  name: string | null;
  map: string | null;
  players: number;
  maxPlayers: number;
  playerList: GamePlayer[];
  updatedAt: Date | null;
};

export type GameServerWrite = {
  online: boolean;
  name?: string | null;
  map?: string | null;
  players: number;
  maxPlayers: number;
  playerList: GamePlayer[];
};

export interface IGameServerStatusRepository {
  /** Bot (właściciel RCON) wywołuje cyklicznie — nadpisuje migawkę. */
  set(snapshot: GameServerWrite): Promise<void>;
  /** Surowy odczyt; ocena świeżości (online/offline) należy do warstwy wyżej. */
  get(): Promise<GameServerSnapshot>;
}
