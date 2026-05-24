import type { ChatInputCommandInteraction } from "discord.js";

import {
  handleCfgAddReward,
  handleCfgCheckRole,
  handleCfgListRewards,
  handleCfgSetGoodbye,
  handleCfgSetWelcome,
  handleCfgSyncAll,
  handleCfgSyncRole,
} from "./admin";
import { requireAdminRole } from "./guard";
import { handleTestAddXp, handleTestGoodbye, handleTestWelcome } from "./test";
import { handleLevel } from "./user";

type Handler = (interaction: ChatInputCommandInteraction) => Promise<void>;

const handlers: Record<string, Handler> = {
  level: handleLevel,
  cfg_setwelcome: handleCfgSetWelcome,
  cfg_setgoodbye: handleCfgSetGoodbye,
  cfg_addreward: handleCfgAddReward,
  cfg_listrewards: handleCfgListRewards,
  cfg_syncrole: handleCfgSyncRole,
  cfg_syncall: handleCfgSyncAll,
  cfg_checkrole: handleCfgCheckRole,
  test_addxp: handleTestAddXp,
  test_welcome: handleTestWelcome,
  test_goodbye: handleTestGoodbye,
};

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) {
    await interaction.reply({
      content: "Ta komenda działa tylko na serwerze.",
      ephemeral: true,
    });
    return;
  }

  const isRestricted =
    interaction.commandName.startsWith("cfg_") ||
    interaction.commandName.startsWith("test_");

  if (isRestricted) {
    const ok = await requireAdminRole(interaction);
    if (!ok) return;
  }

  const handler = handlers[interaction.commandName];
  if (!handler) {
    await interaction.reply({ content: "Nieznana komenda.", ephemeral: true });
    return;
  }

  await handler(interaction);
}
