import type { ChatInputCommandInteraction } from "discord.js";

export async function requireAdminRole(interaction: ChatInputCommandInteraction) {
  const adminRoleId = process.env.CFG_ADMIN_ROLE_ID;
  if (!adminRoleId) {
    await interaction.reply({
      content: "Brak CFG_ADMIN_ROLE_ID w .env. Ustaw ID roli admina.",
      ephemeral: true,
    });
    return false;
  }

  if (!interaction.guild) return false;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(adminRoleId);

  if (!hasRole) {
    await interaction.reply({
      content: "Nie masz wymaganej roli do użycia tej komendy.",
      ephemeral: true,
    });
    return false;
  }

  return true;
}
