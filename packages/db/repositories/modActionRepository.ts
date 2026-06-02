import type { ModActionType } from "../providers/mongoose/schemas/modAction.schema";

export type { ModActionType };

export type ModAction = {
  id: string;
  guildId: string;
  type: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
  createdAt: Date;
};

export type AddModActionOpts = {
  guildId: string;
  type: ModActionType;
  userId: string;
  moderatorId: string;
  reason: string;
  extra?: string;
};

export interface IModActionRepository {
  add(opts: AddModActionOpts): Promise<ModAction>;
  getRecent(guildId: string, limit: number): Promise<ModAction[]>;
  getByUser(guildId: string, userId: string): Promise<ModAction[]>;
}
