import type {
  GameServerSnapshot,
  GameServerWrite,
  IGameServerStatusRepository,
} from "../../repositories/gameServerStatusRepository";
import { GameServerStatusModel } from "./schemas/gameServerStatus.schema";

const SINGLETON_ID = "game";

export class GameServerStatusProvider implements IGameServerStatusRepository {
  async set(snapshot: GameServerWrite): Promise<void> {
    await GameServerStatusModel.updateOne(
      { _id: SINGLETON_ID },
      {
        $set: {
          online: snapshot.online,
          name: snapshot.name ?? null,
          map: snapshot.map ?? null,
          version: snapshot.version ?? null,
          players: snapshot.players,
          maxPlayers: snapshot.maxPlayers,
          dinos: snapshot.dinos,
          playerList: snapshot.playerList,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  async get(): Promise<GameServerSnapshot> {
    const doc = await GameServerStatusModel.findById(SINGLETON_ID);
    if (!doc) {
      return {
        online: false,
        name: null,
        map: null,
        version: null,
        players: 0,
        maxPlayers: 0,
        dinos: [],
        playerList: [],
        updatedAt: null,
      };
    }
    return {
      online: doc.online,
      name: doc.name ?? null,
      map: doc.map ?? null,
      version: doc.version ?? null,
      players: doc.players,
      maxPlayers: doc.maxPlayers,
      dinos: doc.dinos ?? [],
      playerList: doc.playerList ?? [],
      updatedAt: doc.updatedAt ?? null,
    };
  }
}
