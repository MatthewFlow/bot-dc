import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type RoleReward = {
  level: number;
  roleId: string;
};

export type GuildConfig = {
  welcomeChannelId?: string;
  goodbyeChannelId?: string;
  levelUpChannelId?: string;
  roleRewards?: RoleReward[];
};

const guildConfigs = new Map<string, GuildConfig>();

const dataDir = join(process.cwd(), "src/data");
const configPath = join(dataDir, "config.json");

const CONFIG_SAVE_DEBOUNCE_MS = 2_000;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function getConfig(guildId: string): GuildConfig | undefined {
  return guildConfigs.get(guildId);
}

export function setConfig(guildId: string, patch: Partial<GuildConfig>) {
  const current = guildConfigs.get(guildId) ?? {};
  guildConfigs.set(guildId, { ...current, ...patch });
  scheduleSave();
}

function isValidRoleReward(r: unknown): r is RoleReward {
  if (typeof r !== "object" || r === null) return false;
  const obj = r as Record<string, unknown>;
  return (
    Number.isInteger(obj.level) &&
    (obj.level as number) >= 1 &&
    typeof obj.roleId === "string" &&
    obj.roleId.length > 0
  );
}

function isValidGuildConfig(v: unknown): v is GuildConfig {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;

  if (obj.welcomeChannelId !== undefined && typeof obj.welcomeChannelId !== "string")
    return false;
  if (obj.goodbyeChannelId !== undefined && typeof obj.goodbyeChannelId !== "string")
    return false;
  if (obj.levelUpChannelId !== undefined && typeof obj.levelUpChannelId !== "string")
    return false;

  if (obj.roleRewards !== undefined) {
    if (!Array.isArray(obj.roleRewards)) return false;
    if (!obj.roleRewards.every(isValidRoleReward)) return false;
  }

  return true;
}

export function loadConfigs() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    if (!existsSync(configPath)) return;

    const raw = readFileSync(configPath, "utf8");
    const obj: unknown = JSON.parse(raw);

    if (typeof obj !== "object" || obj === null) {
      console.error("config.json ma nieprawidłową strukturę — oczekiwano obiektu");
      return;
    }

    let loaded = 0;
    let skipped = 0;

    for (const [gid, cfg] of Object.entries(obj as Record<string, unknown>)) {
      if (isValidGuildConfig(cfg)) {
        guildConfigs.set(gid, cfg);
        loaded++;
      } else {
        console.warn(`Pominięto nieprawidłowy config dla serwera ${gid}`);
        skipped++;
      }
    }

    console.log(
      `Wczytano configi: ${loaded}${skipped > 0 ? `, pominięto: ${skipped}` : ""}`,
    );
  } catch (e) {
    console.error("Nie udało się wczytać config.json:", e);
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistConfigs();
  }, CONFIG_SAVE_DEBOUNCE_MS);
}

function persistConfigs() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const obj: Record<string, GuildConfig> = {};
    for (const [gid, cfg] of guildConfigs.entries()) obj[gid] = cfg;

    writeFileSync(configPath, JSON.stringify(obj, null, 2), "utf8");
  } catch (e) {
    console.error("Nie udało się zapisać config.json:", e);
  }
}
