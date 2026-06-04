import type { ISessionRepository } from "../../repositories/sessionRepository";
import { SessionModel } from "./schemas/session.schema";

export class SessionProvider implements ISessionRepository {
  async set(userId: string, accessToken: string, ttlMs: number): Promise<void> {
    await SessionModel.findOneAndUpdate(
      { userId },
      { accessToken, expiresAt: new Date(Date.now() + ttlMs) },
      { upsert: true },
    );
  }

  async get(userId: string): Promise<string | null> {
    const doc = await SessionModel.findOne({ userId }).lean();
    if (!doc) return null;
    // TTL deletion is eventual — guard against a not-yet-purged expired doc.
    if (doc.expiresAt.getTime() <= Date.now()) {
      await SessionModel.deleteOne({ userId });
      return null;
    }
    return doc.accessToken;
  }

  async delete(userId: string): Promise<void> {
    await SessionModel.deleteOne({ userId });
  }
}
