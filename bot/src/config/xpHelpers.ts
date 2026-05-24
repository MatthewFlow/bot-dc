import { XP_PER_LEVEL } from "./xp";

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  return level * XP_PER_LEVEL - xp;
}
