import type {
  BotHeartbeat,
  BotStatusSnapshot,
  IBotStatusRepository,
} from "../../repositories/botStatusRepository";
import { BotStatusModel } from "./schemas/botStatus.schema";

const SINGLETON_ID = "bot";

export class BotStatusProvider implements IBotStatusRepository {
  async heartbeat(opts: BotHeartbeat): Promise<void> {
    await BotStatusModel.updateOne(
      { _id: SINGLETON_ID },
      {
        $set: {
          lastHeartbeat: new Date(),
          ...(opts.username !== undefined ? { username: opts.username } : {}),
          ...(opts.avatar !== undefined ? { avatar: opts.avatar } : {}),
          ...(opts.guildCount !== undefined ? { guildCount: opts.guildCount } : {}),
          ...(opts.startedAt !== undefined ? { startedAt: opts.startedAt } : {}),
          ...(opts.ping !== undefined ? { ping: opts.ping } : {}),
          ...(opts.version !== undefined ? { version: opts.version } : {}),
        },
      },
      { upsert: true },
    );
  }

  async get(): Promise<BotStatusSnapshot> {
    const doc = await BotStatusModel.findById(SINGLETON_ID);
    if (!doc) {
      return {
        username: null,
        avatar: null,
        guildCount: 0,
        startedAt: null,
        ping: null,
        version: null,
        lastHeartbeat: null,
      };
    }
    return {
      username: doc.username ?? null,
      avatar: doc.avatar ?? null,
      guildCount: doc.guildCount ?? 0,
      startedAt: doc.startedAt ?? null,
      ping: doc.ping ?? null,
      version: doc.version ?? null,
      lastHeartbeat: doc.lastHeartbeat ?? null,
    };
  }
}
