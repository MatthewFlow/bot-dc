import type { StringSelectMenuInteraction } from "discord.js";

import { getCachedGuildConfig } from "../utils/configCache";

/**
 * Wybór ról z menu rozwijanego. `custom_id` = "sr"; opcje menu niosą roleId (wartości),
 * więc bez odczytu z bazy. Synchronizuje role członka z zaznaczeniem: nadaje zaznaczone,
 * zdejmuje odznaczone (spośród ról z tego menu). Odpowiedź ephemeralna.
 */
export async function handleSelectRole(interaction: StringSelectMenuInteraction) {
  const guild = interaction.guild;
  if (!guild) return;

  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    await interaction
      .reply({ ephemeral: true, content: "Nie udało się pobrać Twojego profilu." })
      .catch(() => {});
    return;
  }

  const menuRoleIds = interaction.component.options.map((o) => o.value);
  const selected = new Set(interaction.values);

  const added: string[] = [];
  const removed: string[] = [];
  for (const roleId of menuRoleIds) {
    const has = member.roles.cache.has(roleId);
    const want = selected.has(roleId);
    try {
      if (want && !has) {
        await member.roles.add(roleId);
        added.push(roleId);
      } else if (!want && has) {
        await member.roles.remove(roleId);
        removed.push(roleId);
      }
    } catch {
      // Pojedyncze błędy (hierarchia/uprawnienia) pomijamy — resztę i tak synchronizujemy.
    }
  }

  // Weryfikacja: nadanie verifiedRoleId zdejmuje joinRoleId (jak w button/reaction roles).
  if (added.length > 0) {
    const cfg = await getCachedGuildConfig(guild.id);
    if (cfg?.verifiedRoleId && added.includes(cfg.verifiedRoleId) && cfg.joinRoleId) {
      await member.roles.remove(cfg.joinRoleId).catch(() => {});
    }
  }

  const name = (id: string) => guild.roles.cache.get(id)?.name ?? id;
  const parts: string[] = [];
  if (added.length > 0) parts.push(`➕ Nadano: ${added.map(name).join(", ")}`);
  if (removed.length > 0) parts.push(`➖ Zdjęto: ${removed.map(name).join(", ")}`);

  await interaction
    .reply({
      ephemeral: true,
      content: parts.length > 0 ? parts.join("\n") : "Bez zmian.",
    })
    .catch(() => {});
}
