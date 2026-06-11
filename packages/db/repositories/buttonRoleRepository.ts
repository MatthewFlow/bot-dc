import type { EmbedConfig } from "../embed";

export type ButtonRoleEntry = {
  /** Tekst na przycisku (1–80 znaków). */
  label: string;
  /** Emoji na przycisku — unicode (✅) lub custom `<:nazwa:id>`. Opcjonalne. */
  emoji?: string;
  roleId: string;
};

export type ButtonRole = {
  guildId: string;
  channelId: string;
  messageId: string;
  embed?: EmbedConfig;
  entries: ButtonRoleEntry[];
};

export interface IButtonRoleRepository {
  getByGuildId(guildId: string): Promise<ButtonRole[]>;
  getByMessageId(messageId: string): Promise<ButtonRole | null>;
  create(data: ButtonRole): Promise<ButtonRole>;
  delete(messageId: string): Promise<void>;
}
