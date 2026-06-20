import type { ActivityEventType } from "../providers/mongoose/schemas/activityEvent.schema";

export type { ActivityEventType };

export type ActivityEvent = {
  id: string;
  guildId: string;
  type: ActivityEventType;
  userId: string;
  level?: number;
  roleId?: string;
  roleName?: string;
  createdAt: Date;
};

export type AddActivityEventOpts = {
  guildId: string;
  type: ActivityEventType;
  userId: string;
  level?: number;
  roleId?: string;
  roleName?: string;
};

export interface IActivityEventRepository {
  add(opts: AddActivityEventOpts): Promise<void>;
  getRecent(guildId: string, limit: number): Promise<ActivityEvent[]>;
}
