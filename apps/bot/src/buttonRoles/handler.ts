import type { ButtonInteraction } from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";

/**
 * Klik w przycisk roli. `customId` ma postać `br:<roleId>` — sam w sobie niesie
 * docelową rolę, więc nie potrzebujemy odczytu z bazy (Discord gwarantuje, że
 * komponent pochodzi z naszej wiadomości). Klik przełącza rolę: nadaje, jeśli
 * członek jej nie ma, lub zdejmuje, jeśli ma. Odpowiedź jest ephemeralna.
 */
export async function handleButtonRoleClick(interaction: ButtonInteraction) {
  const roleId = interaction.customId.slice(3); // po prefiksie "br:"
  const guild = interaction.guild;
  if (!guild || !roleId) return;

  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    await interaction
      .reply({ ephemeral: true, content: "Nie udało się pobrać Twojego profilu." })
      .catch(() => {});
    return;
  }

  const role =
    guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null));
  if (!role) {
    await interaction
      .reply({ ephemeral: true, content: "Ta rola już nie istnieje." })
      .catch(() => {});
    return;
  }

  const hasRole = member.roles.cache.has(roleId);
  try {
    if (hasRole) {
      await member.roles.remove(roleId);
      await interaction.reply({
        ephemeral: true,
        content: `➖ Zdjęto rolę **${role.name}**.`,
      });
    } else {
      await member.roles.add(roleId);
      // Weryfikacja: nadanie verifiedRoleId zdejmuje joinRoleId (jak w reaction roles).
      // Lookup configu tylko przy nadaniu i z 15s cache — klik nadal jest tani.
      const cfg = await getCachedGuildConfig(guild.id);
      if (cfg?.verifiedRoleId === roleId && cfg.joinRoleId) {
        await member.roles.remove(cfg.joinRoleId).catch(() => {});
      }
      await interaction.reply({
        ephemeral: true,
        content: `➕ Nadano rolę **${role.name}**.`,
      });
    }
  } catch {
    await interaction
      .reply({
        ephemeral: true,
        content: `Nie udało się zmienić roli **${role.name}** — sprawdź, czy mam uprawnienie „Zarządzanie rolami" i czy moja rola jest wyżej niż **${role.name}**.`,
      })
      .catch(() => {});
  }
}
