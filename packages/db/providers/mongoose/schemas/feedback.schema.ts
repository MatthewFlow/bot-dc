import { type Model, model, Schema } from "mongoose";

import type {
  FeedbackCategory,
  FeedbackReply,
  FeedbackStatus,
} from "../../../repositories/feedbackRepository";

export type FeedbackDocument = {
  userId: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  guildId?: string;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  /** Stan obsługi przez ekipę (panel). */
  status: FeedbackStatus;
  /** userId tych, którzy dali głos (długość = liczba głosów). */
  upvotedBy: string[];
  /** Odpowiedzi ekipy na zgłoszenie. */
  replies: FeedbackReply[];
  createdAt: Date;
};

const replySchema = new Schema<FeedbackReply>(
  {
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false, versionKey: false },
);

const feedbackSchema = new Schema<FeedbackDocument>(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    displayName: { type: String },
    avatar: { type: String },
    guildId: { type: String },
    category: {
      type: String,
      enum: ["bug", "suggestion", "other"],
      default: "other",
    },
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5 },
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved"],
      default: "new",
    },
    upvotedBy: { type: [String], default: [] },
    replies: { type: [replySchema], default: [] },
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
