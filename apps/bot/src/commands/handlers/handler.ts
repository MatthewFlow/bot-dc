import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { handleRemind, handleReminders } from "../../reminders/handler";
import {
  handleTicketAdd,
  handleTicketClose,
  handleTicketDelete,
  handleTicketSetup,
} from "../../tickets/handler";
import { getCachedGuildConfig } from "../../utils/configCache";
import { isModuleEnabled, type ModuleKey } from "../../utils/modules";
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
import {
  handleGameAnnounce,
  handleGameBan,
  handleGameKick,
  handleGamePlayers,
  handleGameSave,
  handleGameStatus,
} from "./game";
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
import {
  handleCfgAddXp,
  handleTestGoodbye,
  handleTestTranslate,
  handleTestWelcome,
} from "./test";
import { handleFeedback, handleLeaderboard, handleLevel, handleProfile } from "./user";

type Handler = (interaction: ChatInputCommandInteraction) => Promise<void>;

/** Komendy należące do przełączalnych modułów — gdy moduł wyłączony, odrzucamy. */
const COMMAND_MODULE: Record<string, ModuleKey> = {
  level: "leveling",
  leaderboard: "leveling",
  profile: "leveling",
  feedback: "feedback",
  ticket_setup: "tickets",
  ticket_close: "tickets",
  ticket_add: "tickets",
  ticket_delete: "tickets",
};

const handlers: Record<string, Handler> = {
  level: handleLevel,
  leaderboard: handleLeaderboard,
  profile: handleProfile,
  feedback: handleFeedback,
  remind: handleRemind,
  reminders: handleReminders,
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
  ticket_delete: handleTicketDelete,
  test_welcome: handleTestWelcome,
  test_goodbye: handleTestGoodbye,
  test_translate: handleTestTranslate,
  game_status: handleGameStatus,
  game_players: handleGamePlayers,
  game_announce: handleGameAnnounce,
  game_save: handleGameSave,
  game_kick: handleGameKick,
  game_ban: handleGameBan,
};

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId || !interaction.guild) {
    await interaction.reply({
      content: "Ta komenda działa tylko na serwerze.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Komendy wyłączone na serwerze z panelu — odrzucamy zanim trafią do handlera.
  // Config czytany przez 15s cache (ten sam co auto-mod), więc bez kosztu DB per komenda.
  const cfg = await getCachedGuildConfig(guildId);
  if (cfg?.disabledCommands?.includes(interaction.commandName)) {
    await interaction.reply({
      content: "Ta komenda jest wyłączona na tym serwerze.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Moduł, do którego należy komenda, wyłączony na serwerze.
  const moduleKey = COMMAND_MODULE[interaction.commandName];
  if (moduleKey && !isModuleEnabled(cfg, moduleKey)) {
    await interaction.reply({
      content: "Ten moduł jest wyłączony na tym serwerze.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ticket_close / ticket_add są dostępne wewnątrz wątku (dostęp gated przez membership
  // prywatnego wątku) — tylko ticket_setup wymaga roli admina.
  const isRestricted =
    interaction.commandName.startsWith("cfg_") ||
    interaction.commandName.startsWith("test_") ||
    interaction.commandName.startsWith("mod_") ||
    interaction.commandName.startsWith("game_") ||
    interaction.commandName === "ticket_setup" ||
    interaction.commandName === "ticket_delete";

  if (isRestricted) {
    const ok = await requireAdminRole(interaction);
    if (!ok) return;
  }

  const handler = handlers[interaction.commandName];
  if (!handler) {
    await interaction.reply({
      content: "Nieznana komenda.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await handler(interaction);
}
