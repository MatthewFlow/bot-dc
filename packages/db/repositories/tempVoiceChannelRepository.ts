export type TempVoiceChannel = {
  id: string;
  guildId: string;
  channelId: string;
  hubChannelId: string;
  ownerId: string;
  createdAt: Date;
};

export type CreateTempVoiceOpts = {
  guildId: string;
  channelId: string;
  hubChannelId: string;
  ownerId: string;
};

export interface ITempVoiceChannelRepository {
  add(opts: CreateTempVoiceOpts): Promise<TempVoiceChannel>;
  getByChannel(channelId: string): Promise<TempVoiceChannel | null>;
  /** Liczba aktywnych temp-kanałów danego hubu (do numeracji `{count}`). */
  countByHub(guildId: string, hubChannelId: string): Promise<number>;
  /** Wszystkie temp-kanały (do sprzątania sierot przy starcie bota). */
  getAll(): Promise<TempVoiceChannel[]>;
  delete(channelId: string): Promise<void>;
}
