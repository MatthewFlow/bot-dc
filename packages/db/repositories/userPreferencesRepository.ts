/** Języki obsługiwane przez panel. */
export type AppLang = "pl" | "en";

export interface IUserPreferencesRepository {
  /** Zwraca zapisany język użytkownika lub `null`, gdy nie ustawił własnego. */
  getLang(userId: string): Promise<AppLang | null>;
  /** Zapisuje (upsert) wybrany język użytkownika. */
  setLang(userId: string, lang: AppLang): Promise<void>;
}
