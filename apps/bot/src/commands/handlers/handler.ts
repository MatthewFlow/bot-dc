import type { ChatInputCommandInteraction } from "discord.js";

import {
  handleCfgAddReward,
  handleCfgCheckRole,
  handleCfgClear,
  handleCfgRoleList,
  handleCfgSetGoodbye,
  handleCfgSetModLog,
  handleCfgSetTicketRole,
  handleCfgSetWelcome,
  handleCfgSyncVerify,
  handleCfgSyncXp,
} from "./admin";
import { requireAdminRole } from "./guard";
import {
  handleModBan,
  handleModClearWarns,
  handleModKick,
  handleModMute,
  handleModUnmute,
  handleModWarn,
  handleModWarnings,
} from "./mod";
import { handleCfgAddXp, handleTestGoodbye, handleTestWelcome } from "./test";
import { handleTicketAdd, handleTicketClose, handleTicketSetup } from "../../tickets/handler";
import { handleLeaderboard, handleLevel, handleProfile } from "./user";

type Handler = (interaction: ChatInputCommandInteraction) => Promise<void>;

const handlers: Record<string, Handler> = {
  level: handleLevel,
  leaderboard: handleLeaderboard,
  profile: handleProfile,
  cfg_setwelcome: handleCfgSetWelcome,
  cfg_setgoodbye: handleCfgSetGoodbye,
  cfg_addreward: handleCfgAddReward,
  cfg_rolelist: handleCfgRoleList,
  cfg_syncxp: handleCfgSyncXp,
  cfg_syncverify: handleCfgSyncVerify,
  cfg_checkrole: handleCfgCheckRole,
  cfg_clear: handleCfgClear,
  cfg_setmodlog: handleCfgSetModLog,
  cfg_setticketrole: handleCfgSetTicketRole,
  cfg_addxp: handleCfgAddXp,
  mod_warn: handleModWarn,
  mod_warnings: handleModWarnings,
  mod_clearwarns: handleModClearWarns,
  mod_mute: handleModMute,
  mod_unmute: handleModUnmute,
  mod_kick: handleModKick,
  mod_ban: handleModBan,
  ticket_setup: handleTicketSetup,
  ticket_close: handleTicketClose,
  ticket_add: handleTicketAdd,
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

  // ticket_close / ticket_add są dostępne wewnątrz wątku (dostęp gated przez membership
  // prywatnego wątku) — tylko ticket_setup wymaga roli admina.
  const isRestricted =
    interaction.commandName.startsWith("cfg_") ||
    interaction.commandName.startsWith("test_") ||
    interaction.commandName.startsWith("mod_") ||
    interaction.commandName === "ticket_setup";

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
