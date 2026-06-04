import { model, Schema } from "mongoose";

export type SessionDocument = {
  userId: string;
  accessToken: string;
  expiresAt: Date;
};

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: { type: String, required: true, unique: true },
    // Discord OAuth access token — kept server-side only, never sent to the client.
    accessToken: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);

// TTL index — MongoDB removes the document once expiresAt is reached.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<SessionDocument>("Session", sessionSchema);
