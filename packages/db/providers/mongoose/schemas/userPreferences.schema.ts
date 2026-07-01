import { type Model, model, Schema } from "mongoose";

/**
 * Per-user preferencje panelu (jeden dokument na użytkownika Discorda). Na razie
 * trzyma tylko wybrany język UI — przypięty do konta, więc podąża za userem
 * między urządzeniami (localStorage w panelu jest tylko szybkim cache'em).
 */
export type UserPreferencesDocument = {
  userId: string;
  lang: "pl" | "en";
  updatedAt: Date;
};

const userPreferencesSchema = new Schema<UserPreferencesDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    lang: { type: String, enum: ["pl", "en"], default: "pl" },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

export const UserPreferencesModel: Model<UserPreferencesDocument> =
  model<UserPreferencesDocument>("UserPreference", userPreferencesSchema);
