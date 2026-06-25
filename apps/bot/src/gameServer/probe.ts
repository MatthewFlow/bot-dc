/**
 * Sonda RCON — uruchamiana ręcznie do WERYFIKACJI protokołu przeciw realnemu serwerowi
 * The Isle: Evrima. Nie jest częścią bota.
 *
 *   cd apps/bot && bun run src/gameServer/probe.ts
 *
 * Wymaga RCON_HOST / RCON_PORT / RCON_PASSWORD w env. Jeśli wynik nie zgadza się z grą,
 * popraw bajty komend / parsery w `protocol.ts` (to jedyne miejsce zależne od patcha).
 */
import { getRconConfig } from "./config";
import { createEvrimaRconClient } from "./evrimaClient";

const config = getRconConfig();
if (!config) {
  console.error("Brak RCON_HOST / RCON_PORT / RCON_PASSWORD w env.");
  process.exit(1);
}

const client = createEvrimaRconClient(config);
console.log(`Łączenie z ${config.host}:${config.port} …`);

try {
  const status = await client.getStatus();
  console.log("STATUS:", status);

  const players = await client.getPlayers();
  console.log(`GRACZE (${players.length}):`);
  for (const p of players) {
    console.log(`  - ${p.name}  [${p.id}]${p.dino ? `  ${p.dino}` : ""}`);
  }
} catch (e) {
  console.error("Błąd RCON:", e instanceof Error ? e.message : e);
  console.error(
    "Jeśli połączenie działa, ale dane są puste/dziwne — skalibruj bajty/parsery w protocol.ts.",
  );
} finally {
  await client.close();
}
