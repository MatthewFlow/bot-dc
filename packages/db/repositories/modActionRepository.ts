import type { ModActionType } from "../providers/mongoose/schemas/modAction.schema";

export type { ModActionType };

export type ModAction = {
  id: string;
  guildId: string;
  type: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
  createdAt: Date;
};

export type AddModActionOpts = {
  guildId: string;
  type: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
};

/** Filtr zliczania akcji w oknie czasowym (do statystyk dashboardu). */
export type CountSinceFilter = {
  type?: ModActionType;
  moderatorId?: string;
};

export interface IModActionRepository {
  add(opts: AddModActionOpts): Promise<ModAction>;
  getRecent(guildId: string, limit: number): Promise<ModAction[]>;
  getByUser(guildId: string, userId: string): Promise<ModAction[]>;
  /** Liczba akcji danego typu/moderatora od `since` (włącznie). */
  countSince(guildId: string, since: Date, filter?: CountSinceFilter): Promise<number>;
  /**
   * Najświeższa akcja danego typu dla każdego z podanych użytkowników — jedno
   * zapytanie zamiast N (np. powód aktywnych wyciszeń). Mapa userId → akcja.
   */
  latestByUsers(
    guildId: string,
    type: ModActionType,
    userIds: string[],
  ): Promise<Map<string, ModAction>>;
}
