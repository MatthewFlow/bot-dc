import type { RconConfig } from "./rcon";

/**
 * Czyta konfigurację RCON z env (RCON_HOST/RCON_PORT/RCON_PASSWORD).
 * Zwraca `null`, gdy któraś zmienna jest pusta — integracja jest opcjonalna.
 */
export function getRconConfig(): RconConfig | null {
  const host = process.env.RCON_HOST?.trim();
  const port = Number(process.env.RCON_PORT);
  const password = process.env.RCON_PASSWORD;
  if (!host || !Number.isInteger(port) || port <= 0 || !password) return null;
  return { host, port, password };
}
