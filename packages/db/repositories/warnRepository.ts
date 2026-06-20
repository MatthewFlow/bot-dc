export type Warn = {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: Date;
};

export type AddWarnOpts = {
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
};

export interface IWarnRepository {
  add(opts: AddWarnOpts): Promise<Warn>;
  getAll(guildId: string, userId: string): Promise<Warn[]>;
  clear(guildId: string, userId: string): Promise<number>;
  /** Łączna liczba ostrzeżeń na całym serwerze (do statystyk dashboardu). */
  countByGuild(guildId: string): Promise<number>;
  /** Liczba ostrzeżeń dodanych od `since` (trend „w tym tygodniu"). */
  countSince(guildId: string, since: Date): Promise<number>;
}
