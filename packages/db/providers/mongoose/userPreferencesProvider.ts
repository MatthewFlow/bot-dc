import type {
  AppLang,
  IUserPreferencesRepository,
} from "../../repositories/userPreferencesRepository";
import { UserPreferencesModel } from "./schemas/userPreferences.schema";

export class UserPreferencesProvider implements IUserPreferencesRepository {
  async getLang(userId: string): Promise<AppLang | null> {
    const doc = await UserPreferencesModel.findOne({ userId }).lean();
    return doc?.lang ?? null;
  }

  async setLang(userId: string, lang: AppLang): Promise<void> {
    await UserPreferencesModel.findOneAndUpdate(
      { userId },
      { lang, updatedAt: new Date() },
      { upsert: true },
    );
  }
}
