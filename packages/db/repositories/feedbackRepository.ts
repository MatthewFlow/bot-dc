export type FeedbackCategory = "bug" | "suggestion" | "other";

export type Feedback = {
  id: string;
  /** Discord userId autora (z JWT). */
  userId: string;
  username: string;
  /** Serwer, z kontekstu którego wysłano zgłoszenie (opcjonalnie). */
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  /** Ocena 1–5 (opcjonalna). */
  rating?: number;
  createdAt: Date;
};

export type AddFeedbackOpts = {
  userId: string;
  username: string;
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
};

export interface IFeedbackRepository {
  add(opts: AddFeedbackOpts): Promise<Feedback>;
  /** Zgłoszenia danego użytkownika (najnowsze pierwsze). */
  getByUser(userId: string): Promise<Feedback[]>;
  /** Zgłoszenia z danego serwera (najnowsze pierwsze). */
  getByGuild(guildId: string, limit?: number): Promise<Feedback[]>;
  /** Liczba zgłoszeń serwera nowszych niż `since` (null = wszystkie). */
  countByGuildSince(guildId: string, since: Date | null): Promise<number>;
  /** Znacznik „przeczytane do" danego admina dla serwera (null = nigdy). */
  getSeenAt(userId: string, guildId: string): Promise<Date | null>;
  /** Ustawia znacznik „przeczytane do" dla admina + serwera. */
  markSeen(userId: string, guildId: string, at: Date): Promise<void>;
  /** Usuwa zgłoszenie (scoped do serwera). Zwraca true, gdy coś usunięto. */
  delete(id: string, guildId: string): Promise<boolean>;
}
