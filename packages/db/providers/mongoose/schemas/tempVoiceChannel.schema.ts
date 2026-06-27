import { type Model, model, Schema } from "mongoose";

export type TempVoiceChannelDocument = {
  guildId: string;
  /** ID utworzonego temp-kanału głosowego. */
  channelId: string;
  /** Kanał-twórca, z którego powstał. */
  hubChannelId: string;
  /** Użytkownik, dla którego utworzono kanał (właściciel). */
  ownerId: string;
  createdAt: Date;
};

const tempVoiceChannelSchema = new Schema<TempVoiceChannelDocument>(
  {
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    hubChannelId: { type: String, required: true },
    ownerId: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
);

tempVoiceChannelSchema.index({ guildId: 1 });

export const TempVoiceChannelModel: Model<TempVoiceChannelDocument> =
  model<TempVoiceChannelDocument>("TempVoiceChannel", tempVoiceChannelSchema);
