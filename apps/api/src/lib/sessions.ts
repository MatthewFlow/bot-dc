import { sessionRepository } from "@jurassic-haven/db";

/**
 * Server-side store of Discord OAuth access tokens, keyed by Discord userId.
 * Backed by MongoDB (TTL-indexed) so sessions survive restarts and are shared
 * across horizontally-scaled API instances.
 */
export const sessions = {
  set(userId: string, accessToken: string, ttlMs: number): Promise<void> {
    return sessionRepository.set(userId, accessToken, ttlMs);
  },
  get(userId: string): Promise<string | null> {
    return sessionRepository.get(userId);
  },
  delete(userId: string): Promise<void> {
    return sessionRepository.delete(userId);
  },
};
