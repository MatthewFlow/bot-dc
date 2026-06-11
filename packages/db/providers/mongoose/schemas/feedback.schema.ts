import { type Model, model, Schema } from "mongoose";

import type { FeedbackCategory } from "../../../repositories/feedbackRepository";

export type FeedbackDocument = {
  userId: string;
  username: string;
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  createdAt: Date;
};

const feedbackSchema = new Schema<FeedbackDocument>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    guildId: { type: String },
    category: {
      type: String,
      enum: ["bug", "suggestion", "other"],
      default: "other",
    },
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

feedbackSchema.index({ userId: 1, createdAt: -1 });
feedbackSchema.index({ guildId: 1, createdAt: -1 });

export const FeedbackModel: Model<FeedbackDocument> = model<FeedbackDocument>(
  "Feedback",
  feedbackSchema,
);

/** Stan „przeczytane do" — per admin (userId) i serwer (guildId). */
export type FeedbackReadDocument = {
  userId: string;
  guildId: string;
  seenAt: Date;
};

const feedbackReadSchema = new Schema<FeedbackReadDocument>(
  {
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    seenAt: { type: Date, required: true },
  },
  { versionKey: false },
);

feedbackReadSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const FeedbackReadModel: Model<FeedbackReadDocument> = model<FeedbackReadDocument>(
  "FeedbackRead",
  feedbackReadSchema,
);
