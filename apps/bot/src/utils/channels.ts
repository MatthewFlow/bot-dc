import { ChannelType, type GuildBasedChannel } from "discord.js";

export function isAllowedTextChannel(ch: GuildBasedChannel | null | undefined) {
  return (
    !!ch &&
    (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
  );
}
