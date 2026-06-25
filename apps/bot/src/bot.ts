import { botStatusRepository } from "@jurassic-haven/db";
import {
  type ButtonInteraction,
  Client,
  GatewayIntentBits,
  type ModalSubmitInteraction,
  Options,
  Partials,
} from "discord.js";

import { startAutoModSweep } from "./automod/automod";
import { checkRaid } from "./automod/raid";
import { handleButtonRoleClick } from "./buttonRoles/handler";
import { handleCommand } from "./commands/handlers/handler";
import { clearGuildCommands, registerCommands } from "./commands/register";
import { onGuildCreate } from "./events/guildCreate";
import { onGuildDelete } from "./events/guildDelete";
import { onMemberAdd } from "./events/memberAdd";
import { onMemberRemove } from "./events/memberRemove";
import { onMessageCreate } from "./events/messageCreate";
import { onMessageReactionAdd } from "./events/messageReactionAdd";
import { onMessageReactionRemove } from "./events/messageReactionRemove";
import { onThreadDelete } from "./events/threadDelete";
import { onThreadUpdate } from "./events/threadUpdate";
import { handleFeedbackSubmit, showFeedbackModal } from "./feedback/feedback";
import { startGameStatusSweep } from "./gameServer/statusSweep";
import { startJobWorker } from "./jobs/worker";
import { startVoiceXp } from "./levels/voiceXp";
import {
  onGuildMemberUpdateLog,
  onMemberJoinLog,
  onMemberLeaveLog,
  onMessageDeleteLog,
  onMessageUpdateLog,
} from "./serverLog/serverLog";
import {
  handleTicketClaim,
  handleTicketSubmit,
  showTicketModal,
} from "./tickets/handler";
import { onTranslateMessage } from "./translation/handler";
import { getCachedGuildConfig } from "./utils/configCache";
import { isModuleEnabled, type ModuleKey } from "./utils/modules";
import { BOT_VERSION } from "./version";
import { startWarnDecay } from "./warnDecay";

/**
 * Odrzuca interakcję, gdy moduł jest wyłączony na serwerze (odpowiada ephemerally).
 * Zwraca `true`, gdy zablokowano — wtedy handler nie powinien się wykonać.
 */
async function moduleBlocked(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  key: ModuleKey,
): Promise<boolean> {
  if (!interaction.guildId) return false;
  const cfg = await getCachedGuildConfig(interaction.guildId);
  if (isModuleEnabled(cfg, key)) return false;
  await interaction
    .reply({ content: "Ten moduł jest wyłączony na tym serwerze.", ephemeral: true })
    .catch(() => {});
  return true;
}

/** Co ile bot odświeża heartbeat w bazie (API uznaje go za offline po ~3 nieudanych). */
const HEARTBEAT_MS = 30_000;

export function createBot() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Reaction, Partials.User],
    // Ograniczenie cache w RAM. Świadomie NIE ruszamy GuildMemberManager —
    // automod/autorole/role weryfikacji oraz XP głosowe czytają role z cache
    // członków, więc zostaje domyślny. Tniemy za to rzeczy nieużywane lub
    // odtwarzalne z eventów/partiali.
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 100, // mniej niż domyślne 200 — serverlog patrzy tylko na świeże
      ReactionManager: 0, // reakcje obsługujemy z eventu/partiala, nie z cache
      GuildInviteManager: 0, // nieużywane
      GuildScheduledEventManager: 0, // nieużywane
      AutoModerationRuleManager: 0, // mamy własny automod
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      // Zamiataj wiadomości starsze niż 1 h co 30 min — heavy obiekty, a serverlog
      // i tak dotyczy świeżych edycji/usunięć.
      messages: { interval: 1_800, lifetime: 3_600 },
      // Zamiataj userów-boty (poza naszym) — userów-ludzi zostawiamy, bo trzyma je
      // też cache członków (sweep mógłby je zdesynchronizować).
      users: {
        interval: 3_600,
        filter: () => (u) => u.bot && u.id !== u.client.user?.id,
      },
    },
  });

  client.once("clientReady", async () => {
    if (!client.user) return;

    console.log(`Zalogowano jako ${client.user.tag}`);

    // Heartbeat do bazy — panel pokazuje na jego podstawie status online/offline.
    const beat = () =>
      botStatusRepository
        .heartbeat({
          username: client.user?.tag,
          avatar: client.user?.displayAvatarURL() ?? null,
          guildCount: client.guilds.cache.size,
          startedAt: client.readyAt ?? new Date(),
          // Ping bywa -1 do pierwszego pomiaru — wtedy nie nadpisujemy pola.
          ping: client.ws.ping >= 0 ? Math.round(client.ws.ping) : undefined,
          version: BOT_VERSION,
        })
        .catch(() => {});
    await beat();
    // unref — nie blokuje zamknięcia procesu (połączenie gatewaya i tak trzyma go żywym).
    setInterval(beat, HEARTBEAT_MS).unref?.();

    // Naliczanie XP za obecność na kanałach głosowych (co minutę powyżej 1. min).
    startVoiceXp(client);

    // Okresowe czyszczenie mapy anty-spamu auto-moderacji.
    startAutoModSweep();

    // Okresowe wygasanie ostrzeżeń (decay) zgodnie z konfiguracją serwerów.
    startWarnDecay(client);

    // Worker kolejki zadań bot↔panel (zaplanowane/cykliczne ogłoszenia itd.).
    startJobWorker(client);

    // Migawka stanu serwera gry (RCON) do DB — tylko gdy skonfigurowany.
    startGameStatusSweep();

    // Rejestracja komend leci NA KOŃCU i w tle: to wolny, podatny na rate-limit PUT do
    // Discorda. Gdyby się zawiesił, nie może blokować heartbeatu ani zadań tła powyżej
    // (wcześniej był przed nimi i jeden zawieszony PUT zostawiał bota jako "offline").
    void (async () => {
      try {
        if (process.env.RESET_COMMANDS === "true") {
          await clearGuildCommands(client);
        }
        await registerCommands(client);
      } catch (e) {
        console.error("Rejestracja komend nie wyszła:", e);
      }
    })();
  });

  client.on("guildCreate", onGuildCreate);
  client.on("guildDelete", onGuildDelete);
  client.on("guildMemberAdd", onMemberAdd);
  client.on("guildMemberAdd", checkRaid); // wykrywanie raidów (decoupled)
  client.on("guildMemberRemove", onMemberRemove);
  client.on("messageCreate", onMessageCreate);
  // Auto-tłumaczenie (osobny listener — łapie też webhooki/boty, które XP/automod pomija).
  client.on("messageCreate", onTranslateMessage);
  client.on("messageReactionAdd", onMessageReactionAdd);
  client.on("messageReactionRemove", onMessageReactionRemove);
  client.on("threadDelete", onThreadDelete);
  client.on("threadUpdate", onThreadUpdate);

  // Server logging (separate listeners so logging stays decoupled).
  client.on("messageDelete", onMessageDeleteLog);
  client.on("messageUpdate", onMessageUpdateLog);
  client.on("guildMemberAdd", onMemberJoinLog);
  client.on("guildMemberRemove", onMemberLeaveLog);
  client.on("guildMemberUpdate", onGuildMemberUpdateLog);

  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }
    if (interaction.isButton()) {
      const { customId } = interaction;
      if (customId === "ticket_open" || customId === "ticket_claim") {
        if (await moduleBlocked(interaction, "tickets")) return;
        if (customId === "ticket_open") await showTicketModal(interaction);
        else await handleTicketClaim(interaction);
      } else if (customId === "feedback_open") {
        if (await moduleBlocked(interaction, "feedback")) return;
        await showFeedbackModal(interaction);
      } else if (customId.startsWith("br:")) {
        if (await moduleBlocked(interaction, "selfroles")) return;
        await handleButtonRoleClick(interaction);
      }
      return;
    }
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "ticket_submit") {
        if (await moduleBlocked(interaction, "tickets")) return;
        await handleTicketSubmit(interaction);
      } else if (interaction.customId === "feedback_submit") {
        if (await moduleBlocked(interaction, "feedback")) return;
        await handleFeedbackSubmit(interaction);
      }
    }
  });

  return client;
}
