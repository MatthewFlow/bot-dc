import type { GuildMember } from "discord.js";

/**
 * Zwraca funkcję podstawiającą zmienne szablonu na dane członka.
 * Obsługiwane: {user}, {username}, {server}, {member_count}, {avatar}.
 */
export function memberVarReplacer(member: GuildMember): (template: string) => string {
  return (template: string) =>
    template
      .replace(/{user}/g, `<@${member.id}>`)
      .replace(/{username}/g, member.user.username)
      .replace(/{server}/g, member.guild.name)
      .replace(/{member_count}/g, String(member.guild.memberCount))
      .replace(/{avatar}/g, member.user.displayAvatarURL({ size: 256 }));
}
