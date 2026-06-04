import { guildConfigRepository } from "@jurassic-haven/db";
import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";

/**
 * Authorizes `/cfg_*`, `/mod_*` and other privileged commands. Multi-tenant aware:
 *  1) members who can manage the server — native **Administrator** or **Manage Server**
 *     permission (covers the owner and anyone who can install/configure the bot) pass;
 *  2) otherwise a per-guild configurable `adminRoleId` (set from the dashboard) is
 *     checked, falling back to the legacy global `CFG_ADMIN_ROLE_ID` env.
 */
export async function requireAdminRole(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Tej komendy można użyć tylko na serwerze.",
      ephemeral: true,
    });
    return false;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  // 1) Native "manage the server" permission (owner, admins, server managers).
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return true;
  }

  // 2) Per-guild admin role, with legacy env fallback.
  const cfg = await guildConfigRepository.get(interaction.guild.id);
  const adminRoleId = cfg?.adminRoleId ?? process.env.CFG_ADMIN_ROLE_ID;
  if (adminRoleId && member.roles.cache.has(adminRoleId)) return true;

  await interaction.reply({
    content: "Nie masz wymaganych uprawnień do użycia tej komendy.",
    ephemeral: true,
  });
  return false;
}
