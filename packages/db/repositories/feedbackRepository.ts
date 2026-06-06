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
}
