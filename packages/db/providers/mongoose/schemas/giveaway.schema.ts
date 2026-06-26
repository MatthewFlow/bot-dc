import { type Model, model, Schema } from "mongoose";

/** Stan giveawaya: aktywny (zbiera wejścia) / zakończony (wylosowano) / anulowany. */
export type GiveawayStatus = "active" | "ended" | "cancelled";

export type GiveawayDocument = {
  guildId: string;
  channelId: string;
  /** ID wiadomości z embedem+przyciskiem; ustawiane po wysłaniu przez bota. */
  messageId?: string;
  prize: string;
  winnerCount: number;
  endsAt: Date;
  /** Opcjonalna rola wymagana do udziału (egzekwowana przez bota, jeśli ustawiona). */
  requiredRoleId?: string;
  /** Kto utworzył giveaway (organizator). */
  hostId: string;
  status: GiveawayStatus;
  /** ID użytkowników, którzy dołączyli. */
  entrants: string[];
  /** ID wylosowanych zwycięzców (ustawiane przy zakończeniu / rerollu). */
  winners: string[];
  createdAt: Date;
  endedAt?: Date;
};

const giveawaySchema = new Schema<GiveawayDocument>(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true },
    messageId: { type: String },
    prize: { type: String, required: true },
    winnerCount: { type: Number, required: true, min: 1 },
    endsAt: { type: Date, required: true },
    requiredRoleId: { type: String },
    hostId: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "ended", "cancelled"],
      default: "active",
    },
    entrants: { type: [String], default: [] },
    winners: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
    endedAt: { type: Date },
  },
  { versionKey: false },
);

// Sweep kończący na czas: aktywne z endsAt w przeszłości.
giveawaySchema.index({ status: 1, endsAt: 1 });
giveawaySchema.index({ guildId: 1, createdAt: -1 });

export const GiveawayModel: Model<GiveawayDocument> = model<GiveawayDocument>(
  "Giveaway",
  giveawaySchema,
);
