import { createBot } from "./bot";
import { token } from "./config/env";
import { loadConfigs } from "./config/store";
import { loadXp } from "./levels/store";

// ===== INIT DATA =====
loadConfigs();
loadXp();

// ===== START BOT =====
const client = createBot();
client.login(token);
