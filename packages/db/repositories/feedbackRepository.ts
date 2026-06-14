export type FeedbackCategory = "bug" | "suggestion" | "other";

/** Stan obsługi zgłoszenia przez ekipę. */
export type FeedbackStatus = "new" | "in_progress" | "resolved";

/** Odpowiedź ekipy na zgłoszenie. */
export type FeedbackReply = {
  authorId: string;
  authorName: string;
  message: string;
  createdAt: Date;
};

export type Feedback = {
  id: string;
  /** Discord userId autora (z JWT). */
  userId: string;
  username: string;
  /** Pseudonim (global_name/nick) zapisany w chwili wysłania; null gdy nieznany. */
  displayName?: string | null;
  /** Avatar autora (URL CDN) zapisany w chwili wysłania; null gdy brak. */
  avatar?: string | null;
  /** Serwer, z kontekstu którego wysłano zgłoszenie (opcjonalnie). */
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  /** Ocena 1–5 (opcjonalna). */
  rating?: number;
  status: FeedbackStatus;
  /** userId tych, którzy dali głos. */
  upvotedBy: string[];
  replies: FeedbackReply[];
  createdAt: Date;
};

export type AddFeedbackOpts = {
  userId: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
};

/** Pojedyncza poprawka tożsamości autora (denormalizacja po rozwiązaniu z Discorda). */
export type FeedbackIdentityPatch = {
  id: string;
  displayName?: string | null;
  avatar?: string | null;
  username?: string;
};

export interface IFeedbackRepository {
  add(opts: AddFeedbackOpts): Promise<Feedback>;
  /** Zgłoszenia danego użytkownika (najnowsze pierwsze). */
  getByUser(userId: string): Promise<Feedback[]>;
  /** Zgłoszenia z danego serwera (najnowsze pierwsze). */
  getByGuild(guildId: string, limit?: number): Promise<Feedback[]>;
  /** Liczba zgłoszeń serwera nowszych niż `since` (null = wszystkie). */
  countByGuildSince(guildId: string, since: Date | null): Promise<number>;
  /**
   * Zapisuje rozwiązaną tożsamość autora (displayName/avatar/username) na starych
   * rekordach — jednorazowy koszt resolve z Discorda znika trwale. Best-effort.
   */
  backfillIdentity(patches: FeedbackIdentityPatch[]): Promise<void>;
  /** Znacznik „przeczytane do" danego admina dla serwera (null = nigdy). */
  getSeenAt(userId: string, guildId: string): Promise<Date | null>;
  /** Ustawia znacznik „przeczytane do" dla admina + serwera. */
  markSeen(userId: string, guildId: string, at: Date): Promise<void>;
  /** Usuwa zgłoszenie (scoped do serwera). Zwraca true, gdy coś usunięto. */
  delete(id: string, guildId: string): Promise<boolean>;
  /** Zmienia status zgłoszenia (scoped do serwera). null = nie znaleziono. */
  setStatus(
    id: string,
    guildId: string,
    status: FeedbackStatus,
  ): Promise<Feedback | null>;
  /** Przełącza głos danego użytkownika (scoped do serwera). null = nie znaleziono. */
  toggleUpvote(id: string, guildId: string, userId: string): Promise<Feedback | null>;
  /** Dodaje odpowiedź ekipy (scoped do serwera). null = nie znaleziono. */
  addReply(id: string, guildId: string, reply: FeedbackReply): Promise<Feedback | null>;
}
