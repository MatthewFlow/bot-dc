import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Łączy klasy warunkowo (clsx) i rozwiązuje konflikty Tailwind (tailwind-merge). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Wspólna klasa karty panelu (uniesiona powierzchnia + obramowanie + tło). */
export const CARD = "surface-raised rounded-xl border border-border bg-card";
