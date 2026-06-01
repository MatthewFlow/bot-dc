type Session = { accessToken: string; expiresAt: number };
const store = new Map<string, Session>();

export const sessions = {
  set(userId: string, accessToken: string, ttlMs: number) {
    store.set(userId, { accessToken, expiresAt: Date.now() + ttlMs });
  },
  get(userId: string): string | null {
    const s = store.get(userId);
    if (!s) return null;
    if (s.expiresAt <= Date.now()) {
      store.delete(userId);
      return null;
    }
    return s.accessToken;
  },
};
