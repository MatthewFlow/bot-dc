import { type Model, model, Schema } from "mongoose";

/** Gracz w migawce serwera gry. */
export type GamePlayer = { id: string; name: string; dino?: string };

/**
 * Pojedynczy dokument (_id: "game") z migawką stanu serwera gry. Bot (jedyny właściciel
 * połączenia RCON) nadpisuje go cyklicznie; API/panel czytają i oceniają świeżość.
 */
export type GameServerStatusDocument = {
  _id: string;
  online: boolean;
  name?: string | null;
  map?: string | null;
  version?: string | null;
  players: number;
  maxPlayers: number;
  /** Włączone (grywalne) dinozaury na serwerze. */
  dinos: string[];
  playerList: GamePlayer[];
  updatedAt: Date;
};

const playerSchema = new Schema<GamePlayer>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    dino: { type: String },
  },
  { _id: false },
);

const gameServerStatusSchema = new Schema<GameServerStatusDocument>(
  {
    _id: { type: String, default: "game" },
    online: { type: Boolean, default: false },
    name: { type: String, default: null },
    map: { type: String, default: null },
    version: { type: String, default: null },
    players: { type: Number, default: 0 },
    maxPlayers: { type: Number, default: 0 },
    dinos: { type: [String], default: [] },
    playerList: { type: [playerSchema], default: [] },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const GameServerStatusModel: Model<GameServerStatusDocument> =
  model<GameServerStatusDocument>("GameServerStatus", gameServerStatusSchema);
