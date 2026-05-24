import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { XP_PER_LEVEL } from "../config/xp";

type UserState = {
  xp: number;
  lastMsgAt?: number;
};

type GuildState = Record<string, UserState>;

const dataDir = join(process.cwd(), "src", "data");
const xpPath = join(dataDir, "xp.json");

const xpData: Record<string, GuildState> = {};

export function loadXp() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    if (!existsSync(xpPath)) return;

    const raw = readFileSync(xpPath, "utf8");
    const obj = JSON.parse(raw) as Record<string, GuildState>;
    for (const [gid, state] of Object.entries(obj)) xpData[gid] = state;

    console.log(`Wczytano XP dla serwerów: ${Object.keys(xpData).length}`);
  } catch (e) {
    console.error("Nie udało się wczytać xp.json:", e);
  }
}

// --- debounce zapisu ---
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persistXp();
  }, 2_000);
}

function persistXp() {
  try {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(xpPath, JSON.stringify(xpData, null, 2), "utf8");
  } catch (e) {
    console.error("Nie udało się zapisać xp.json:", e);
  }
}

export function getUser(guildId: string, userId: string): UserState {
  xpData[guildId] ??= {};
  xpData[guildId][userId] ??= { xp: 0 };
  return xpData[guildId][userId];
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** XP brakujące do następnego levelu. */
export function xpToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  return level * XP_PER_LEVEL - xp;
}

export function addXpWithCooldown(opts: {
  guildId: string;
  userId: string;
  now: number;
  amount: number;
  cooldownMs: number;
}) {
  const u = getUser(opts.guildId, opts.userId);

  const last = u.lastMsgAt ?? 0;
  if (opts.now - last < opts.cooldownMs) {
    const lvl = levelFromXp(u.xp);
    return { gained: 0, oldLevel: lvl, newLevel: lvl };
  }

  const oldLevel = levelFromXp(u.xp);
  u.xp += opts.amount;
  u.lastMsgAt = opts.now;

  const newLevel = levelFromXp(u.xp);
  scheduleSave(); // debounce zamiast natychmiastowego zapisu

  return { gained: opts.amount, oldLevel, newLevel };
}

export function getXp(guildId: string, userId: string) {
  return getUser(guildId, userId).xp;
}

export function addXp(guildId: string, userId: string, amount: number) {
  const u = getUser(guildId, userId);

  const oldLevel = levelFromXp(u.xp);
  u.xp += amount;

  const newLevel = levelFromXp(u.xp);
  scheduleSave();

  return { oldLevel, newLevel, newXp: u.xp };
}

export function setXp(guildId: string, userId: string, xp: number) {
  const u = getUser(guildId, userId);

  const oldLevel = levelFromXp(u.xp);
  u.xp = Math.max(0, xp);

  const newLevel = levelFromXp(u.xp);
  scheduleSave();

  return { oldLevel, newLevel, newXp: u.xp };
}
