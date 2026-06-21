import { describe, expect, test } from "bun:test";

import {
  buildCommand,
  buildLogin,
  CMD,
  PACKET,
  parsePlayables,
  parsePlayers,
  parseServerDetails,
} from "./protocol";

describe("protocol — ramkowanie", () => {
  test("buildLogin: [LOGIN][password][NUL]", () => {
    expect([...buildLogin("pw")]).toEqual([PACKET.LOGIN, 0x70, 0x77, 0x00]);
  });

  test("buildCommand: [COMMAND][cmd][body][NUL]", () => {
    expect([...buildCommand(CMD.PLAYER_LIST, "hi")]).toEqual([
      PACKET.COMMAND,
      CMD.PLAYER_LIST,
      0x68,
      0x69,
      0x00,
    ]);
  });

  test("buildCommand bez body: [COMMAND][cmd][NUL]", () => {
    expect([...buildCommand(CMD.SAVE)]).toEqual([PACKET.COMMAND, CMD.SAVE, 0x00]);
  });
});

describe("protocol — parsePlayers", () => {
  test("parsuje nazwa/id/dino i pomija nagłówek", () => {
    const out = parsePlayers(
      "PlayerList\nRex, 123, Tyrannosaurus\nRaptor, 456, Utahraptor\n",
    );
    expect(out).toEqual([
      { id: "123", name: "Rex", dino: "Tyrannosaurus" },
      { id: "456", name: "Raptor", dino: "Utahraptor" },
    ]);
  });

  test("obsługuje samą nazwę i puste linie", () => {
    expect(parsePlayers("Solo\n\n")).toEqual([
      { id: "Solo", name: "Solo", dino: undefined },
    ]);
  });

  test("pusty input → pusta lista", () => {
    expect(parsePlayers("")).toEqual([]);
  });
});

describe("protocol — parseServerDetails", () => {
  test("wyciąga nazwę, mapę, wersję i limit graczy", () => {
    const d = parseServerDetails(
      "ServerName: Jurassic\nMapName: Gateway\nGameVersion: 0.18.40\nMaxPlayers: 100\n",
    );
    expect(d.name).toBe("Jurassic");
    expect(d.map).toBe("Gateway");
    expect(d.version).toBe("0.18.40");
    expect(d.maxPlayers).toBe(100);
  });

  test("brak pól → undefined", () => {
    const d = parseServerDetails("nic użytecznego");
    expect(d.name).toBeUndefined();
    expect(d.version).toBeUndefined();
    expect(d.maxPlayers).toBeUndefined();
  });
});

describe("protocol — parsePlayables", () => {
  test("czyści nazwy klas dinozaurów i pomija nagłówek", () => {
    const out = parsePlayables(
      "Playables\nBP_Tyrannosaurus_C, BP_Utahraptor_C\nBP_Triceratops_C\n",
    );
    expect(out).toEqual(["Tyrannosaurus", "Utahraptor", "Triceratops"]);
  });

  test("pusty input → pusta lista", () => {
    expect(parsePlayables("")).toEqual([]);
  });
});
