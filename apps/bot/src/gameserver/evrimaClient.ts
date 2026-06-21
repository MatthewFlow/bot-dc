import {
  buildCommand,
  buildLogin,
  CMD,
  parsePlayers,
  parseServerDetails,
} from "./protocol";
import type { PlayerInfo, RconClient, RconConfig, ServerStatus } from "./rcon";

/** Koniec odpowiedzi wykrywamy po ciszy (Evrima nie ma id requestów). */
const IDLE_MS = 300;
/** Twardy limit na pojedynczą komendę. */
const TIMEOUT_MS = 5000;

type BunSocket = Awaited<ReturnType<typeof Bun.connect>>;
type Pending = {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Klient RCON dla The Isle: Evrima na transporcie TCP (Bun.connect). Komendy są
 * serializowane (protokół nie ma id requestów), a koniec odpowiedzi wykrywamy po
 * krótkiej ciszy. Bajty komend i parsowanie żyją w `protocol.ts`.
 */
export class EvrimaRconClient implements RconClient {
  private socket: BunSocket | null = null;
  private chunks: Buffer[] = [];
  private idle: ReturnType<typeof setTimeout> | null = null;
  private pending: Pending | null = null;
  private chain: Promise<unknown> = Promise.resolve();
  private readonly config: RconConfig;

  constructor(config: RconConfig) {
    this.config = config;
  }

  private onData(chunk: Buffer): void {
    this.chunks.push(Buffer.from(chunk));
    if (this.idle) clearTimeout(this.idle);
    this.idle = setTimeout(() => this.flush(), IDLE_MS);
  }

  private flush(): void {
    this.idle = null;
    const text = Buffer.concat(this.chunks).toString("utf8");
    this.chunks = [];
    const p = this.pending;
    if (!p) return; // np. odpowiedź logowania — nikt nie czeka
    this.pending = null;
    clearTimeout(p.timer);
    p.resolve(text);
  }

  private async connect(): Promise<BunSocket> {
    if (this.socket) return this.socket;

    const socket = await Bun.connect({
      hostname: this.config.host,
      port: this.config.port,
      socket: {
        data: (_s, chunk: Buffer) => this.onData(chunk),
        close: () => {
          this.socket = null;
        },
        error: () => {
          this.socket = null;
        },
      },
    });
    this.socket = socket;

    // Logowanie + drenaż ewentualnej odpowiedzi, zanim ruszą prawdziwe komendy.
    socket.write(buildLogin(this.config.password));
    await new Promise((r) => setTimeout(r, IDLE_MS));
    if (this.idle) clearTimeout(this.idle);
    this.idle = null;
    this.chunks = [];
    return socket;
  }

  /** Wysyła komendę i zwraca tekst odpowiedzi. Komendy idą po kolei (serializacja). */
  private command(cmd: number, body = ""): Promise<string> {
    const run = async (): Promise<string> => {
      const socket = await this.connect();
      this.chunks = [];
      return await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending = null;
          reject(new Error("RCON timeout"));
        }, TIMEOUT_MS);
        this.pending = { resolve, reject, timer };
        socket.write(buildCommand(cmd, body));
      });
    };

    const next = this.chain.then(run, run);
    this.chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async getPlayers(): Promise<PlayerInfo[]> {
    return parsePlayers(await this.command(CMD.PLAYER_LIST));
  }

  async getStatus(): Promise<ServerStatus> {
    const players = await this.getPlayers().catch(() => null);
    let details: { name?: string; map?: string; maxPlayers?: number } = {};
    try {
      details = parseServerDetails(await this.command(CMD.SERVER_DETAILS));
    } catch {
      // szczegóły są opcjonalne — liczy się głównie liczba graczy
    }
    return {
      online: players !== null,
      name: details.name,
      map: details.map,
      players: players?.length ?? 0,
      maxPlayers: details.maxPlayers ?? 0,
    };
  }

  async announce(message: string): Promise<void> {
    await this.command(CMD.ANNOUNCE, message);
  }

  async kick(playerId: string, reason?: string): Promise<void> {
    await this.command(CMD.KICK, reason ? `${playerId}\n${reason}` : playerId);
  }

  async ban(playerId: string, reason?: string): Promise<void> {
    // ⚠️ Format bana (czas/powód) do weryfikacji ze swoim serwerem.
    await this.command(CMD.BAN, `${playerId},0,${reason ?? ""}`);
  }

  async save(): Promise<void> {
    await this.command(CMD.SAVE);
  }

  /** Ucieczkowy kanał: `command` jako bajt hex (np. „0x40" / „40") do eksperymentów w probe. */
  async raw(command: string): Promise<string> {
    const byte = Number.parseInt(command.replace(/^0x/i, ""), 16);
    if (Number.isNaN(byte)) throw new Error("raw(): podaj bajt komendy w hex, np. 0x40");
    return this.command(byte);
  }

  async close(): Promise<void> {
    this.socket?.end();
    this.socket = null;
  }
}

export function createEvrimaRconClient(config: RconConfig): RconClient {
  return new EvrimaRconClient(config);
}
