export type BotHeartbeat = {
  username?: string;
  avatar?: string | null;
  guildCount?: number;
  startedAt?: Date;
  ping?: number;
  version?: string;
};

export type BotStatusSnapshot = {
  username: string | null;
  avatar: string | null;
  guildCount: number;
  startedAt: Date | null;
  ping: number | null;
  version: string | null;
  lastHeartbeat: Date | null;
};

export interface IBotStatusRepository {
  /** Bot wywołuje cyklicznie — odświeża lastHeartbeat i metadane. */
  heartbeat(opts: BotHeartbeat): Promise<void>;
  /** Surowy odczyt stanu; ocena świeżości (online/offline) należy do warstwy wyżej. */
  get(): Promise<BotStatusSnapshot>;
}
