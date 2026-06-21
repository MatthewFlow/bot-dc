import type { PlayerInfo } from "./rcon";

/**
 * Warstwa protokołu RCON The Isle: Evrima — ramkowanie pakietów, bajty komend, parsery.
 *
 * ⚠️ Zestaw bajtów komend i format odpowiedzi Evrimy bywa zmienny między patchami.
 * To JEDYNE miejsce do korekty — zweryfikuj realnym serwerem przez `probe.ts` i tu popraw.
 *
 * Ramka (wg dokumentacji społeczności):
 *   - login:   [0x01][password...][0x00]
 *   - komenda: [0x02][cmd][body...][0x00]
 */

const NUL = 0x00;

/** Bajty typu pakietu. */
export const PACKET = {
  LOGIN: 0x01,
  COMMAND: 0x02,
} as const;

/** Bajty komend (do weryfikacji ze swoim serwerem). */
export const CMD = {
  ANNOUNCE: 0x10,
  SERVER_DETAILS: 0x12,
  BAN: 0x20,
  KICK: 0x30,
  PLAYER_LIST: 0x40,
  SAVE: 0x50,
} as const;

export function buildLogin(password: string): Buffer {
  return Buffer.concat([
    Buffer.from([PACKET.LOGIN]),
    Buffer.from(password, "utf8"),
    Buffer.from([NUL]),
  ]);
}

export function buildCommand(cmd: number, body = ""): Buffer {
  return Buffer.concat([
    Buffer.from([PACKET.COMMAND, cmd]),
    Buffer.from(body, "utf8"),
    Buffer.from([NUL]),
  ]);
}

/**
 * Parsuje odpowiedź listy graczy. Tolerancyjnie — różne patche zwracają różny układ.
 * Najczęstszy format to linie „Nazwa, EOSID[, Dino]". Linie nagłówka pomijamy.
 */
export function parsePlayers(raw: string): PlayerInfo[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^player\s*list/i.test(line))
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const name = parts[0] ?? line;
      const id = parts[1] ?? name;
      const dino = parts[2];
      return { id, name, dino: dino || undefined };
    });
}

/**
 * Best-effort wyciągnięcie nazwy/mapy/limitu ze „szczegółów serwera". Format niepewny,
 * więc skanujemy po prostych wzorcach `klucz: wartość`; brak dopasowania = undefined.
 */
export function parseServerDetails(raw: string): {
  name?: string;
  map?: string;
  maxPlayers?: number;
} {
  const find = (re: RegExp): string | undefined => raw.match(re)?.[1]?.trim();
  const max = find(/max\s*players?\s*[:=]\s*(\d+)/i);
  return {
    name: find(/server\s*name\s*[:=]\s*(.+)/i),
    map: find(/map\s*(?:name)?\s*[:=]\s*(.+)/i),
    maxPlayers: max ? Number(max) : undefined,
  };
}
