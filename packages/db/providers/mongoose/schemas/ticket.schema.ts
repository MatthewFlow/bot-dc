import { type Model, model, Schema } from "mongoose";

export type TicketStatus = "pending" | "open" | "closed";

export type TicketDocument = {
  guildId: string;
  threadId: string;
  userId: string;
  status: TicketStatus;
  subject?: string;
  assignedTo?: string;
  createdAt: Date;
  claimedAt?: Date;
  closedAt?: Date;
};

const ticketSchema = new Schema<TicketDocument>(
  {
    guildId: { type: String, required: true },
    threadId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "open", "closed"],
      default: "pending",
    },
    subject: { type: String },
    assignedTo: { type: String },
    createdAt: { type: Date, default: () => new Date() },
    claimedAt: { type: Date },
    closedAt: { type: Date },
  },
  { versionKey: false },
);

ticketSchema.index({ guildId: 1, userId: 1 });
ticketSchema.index({ guildId: 1, status: 1 });

export const TicketModel: Model<TicketDocument> = model<TicketDocument>(
  "Ticket",
  ticketSchema,
);
