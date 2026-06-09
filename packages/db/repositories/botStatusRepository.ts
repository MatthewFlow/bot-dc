export type BotHeartbeat = {
  username?: string;
  avatar?: string | null;
  guildCount?: number;
};

export type BotStatusSnapshot = {
  username: string | null;
  avatar: string | null;
  guildCount: number;
  lastHeartbeat: Date | null;
};

export interface IBotStatusRepository {
  /** Bot wywołuje cyklicznie — odświeża lastHeartbeat i metadane. */
  heartbeat(opts: BotHeartbeat): Promise<void>;
  /** Surowy odczyt stanu; ocena świeżości (online/offline) należy do warstwy wyżej. */
  get(): Promise<BotStatusSnapshot>;
}
