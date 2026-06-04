export interface ISessionRepository {
  /** Stores (upserts) a user's Discord access token with a TTL in milliseconds. */
  set(userId: string, accessToken: string, ttlMs: number): Promise<void>;
  /** Returns the access token, or `null` if missing/expired. */
  get(userId: string): Promise<string | null>;
  /** Removes a user's session (e.g. on logout). */
  delete(userId: string): Promise<void>;
}
