/**
 * Mock serwera RCON The Isle: Evrima — lokalny harness do testów BEZ prawdziwej gry.
 *
 *   cd apps/bot && bun run mock:rcon        # terminal 1
 *   # w .env: RCON_HOST=127.0.0.1  RCON_PORT=7779  RCON_PASSWORD=cokolwiek
 *   bun run probe:rcon                      # terminal 2
 *
 * ⚠️ Mówi NASZYM założonym protokołem (protocol.ts) — sprawdza transport/serializację/
 * parsowanie klienta, ale NIE potwierdza realnego formatu Evrimy (to kalibrujemy później
 * przeciw prawdziwemu serwerowi).
 */
import { CMD, PACKET } from "./protocol";

const port = Number(process.env.MOCK_RCON_PORT ?? 7779);

const FAKE_PLAYERS =
  "PlayerList\nRex, 76561190000000001, Tyrannosaurus\nRaptor, 76561190000000002, Utahraptor\n";
const FAKE_DETAILS =
  "ServerName: Jurassic Test\nMapName: Gateway\nMaxPlayers: 100\nCurrentPlayers: 2\n";

function respond(data: Buffer): string {
  if (data[0] === PACKET.LOGIN) return "Password Accepted\n";
  if (data[0] === PACKET.COMMAND) {
    switch (data[1]) {
      case CMD.PLAYER_LIST:
        return FAKE_PLAYERS;
      case CMD.SERVER_DETAILS:
        return FAKE_DETAILS;
      case CMD.SAVE:
        return "World Saved\n";
      case CMD.ANNOUNCE:
        return "Announced\n";
      default:
        return "OK\n";
    }
  }
  return "";
}

Bun.listen({
  hostname: "127.0.0.1",
  port,
  socket: {
    data(socket, data) {
      const reply = respond(Buffer.from(data));
      if (reply) socket.write(reply);
    },
    open() {},
  },
});

console.log(`Mock RCON (Evrima) słucha na 127.0.0.1:${port}`);
console.log(
  `W .env ustaw:  RCON_HOST=127.0.0.1  RCON_PORT=${port}  RCON_PASSWORD=cokolwiek`,
);
console.log("Potem w drugim terminalu:  bun run probe:rcon");
