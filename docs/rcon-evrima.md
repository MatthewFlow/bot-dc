# RCON — The Isle: Evrima (szkic projektowy)

> Status: **szkic / do przemyślenia** (2026-06-21). Nic z tego nie jest jeszcze
> podłączone do runtime. Celem dokumentu jest uzgodnienie **szwu i kontraktu**,
> zanim powstanie kruchy kod protokołu. Protokół RCON Evrimy bywa zmienny między
> patchami — przed implementacją zweryfikuj aktualny zestaw komend.

## Cel

Zarządzanie serwerem gry **The Isle: Evrima** z Discorda i panelu Jurassic Haven:
ogłoszenia in-game, live lista graczy, kick/ban, zapis świata (save), zaplanowane
restarty i ogłoszenia. Tematycznie pasuje to do całej marki (dinozaury).

## Architektura / granica

Most RCON to **inna domena** niż moderacja Discorda i ma **wyraźną granicę sieciową**
(TCP do serwera gry). Dwie opcje:

1. **Moduł w bocie** (`apps/bot/src/gameserver/`) — najszybszy start, dzieli proces
   z botem. Minus: awaria/blokada socketu RCON może wpływać na bota.
2. **Wydzielona usługa** (osobny serwis, kontrakt po HTTP/gRPC) — czysty izolowany
   komponent **bez współdzielonych typów Discorda**; naturalny kandydat na pierwszy
   serwis w innym języku (np. Go — patrz dyskusja o Go). Minus: dodatkowy runtime/CI.

**Rekomendacja:** zacząć od interfejsu (`RconClient`) i panelu na sztywnych/mockowych
danych, a implementację protokołu wpiąć później — albo w bocie (faza 1), albo wyciąć
do osobnej usługi (faza 2), bez zmiany kontraktu po stronie panelu.

## Kontrakt (`RconClient`)

Patrz szkic: `apps/bot/src/gameserver/rcon.ts` (tylko typy + interfejs, bez impl.).

```
getStatus(): ServerStatus        // online?, nazwa, mapa, gracze/limit, uptime
getPlayers(): PlayerInfo[]       // lista graczy (id, nazwa, dino, ...)
announce(message): void          // broadcast in-game
kick(playerId, reason?): void
ban(playerId, reason?): void
save(): void                     // zapis świata
raw(command): string             // ucieczkowy kanał na komendy spoza API
```

## Reużycie kolejki `botJob`

Mamy już kolejkę zadań (`botJob`, worker w bocie). Zaplanowane akcje serwera gry
dokładają się jako nowe typy zadań — **bez nowej infrastruktury schedulera**:

- `gameAnnounce` — cykliczne ogłoszenie in-game (np. „restart za 10 min").
- `gameRestart` — jednorazowy/cykliczny restart (sekwencja: announce → save → restart).

Worker rozszerza `switch (job.type)` o te przypadki i woła `RconClient`.

## Env (szkielet)

```
RCON_HOST=        # adres serwera gry
RCON_PORT=        # port RCON
RCON_PASSWORD=    # hasło RCON (sekret — nigdy do repo)
```

Dodane jako **zakomentowane** placeholdery w `apps/bot/.env.example`.

## Panel (UX)

Zakładka **„Serwer gry"** (na razie placeholder „wkrótce", jak Giveaways). Docelowo:

- **Status** — online/offline, mapa, gracze/limit, uptime (widget jak status bota).
- **Gracze** — live lista z akcjami kick/ban inline.
- **Akcje** — ogłoszenie in-game, save, restart (z potwierdzeniem).
- **Zaplanowane** — lista zadań `gameAnnounce`/`gameRestart` (reużycie listy z Ogłoszeń).

## Ryzyka / uwagi

- **Protokół niestabilny** — zestaw komend Evrimy zmienia się między patchami; trzymać
  warstwę komend w jednym miejscu (`RconClient`), by patch dotykał jednego pliku.
- **Bezpieczeństwo** — `RCON_PASSWORD` to sekret; połączenie najlepiej w sieci prywatnej
  / przez VPN; akcje destrukcyjne (ban/restart) za guardem uprawnień jak w moderacji.
- **Niezawodność** — socket RCON może paść; reconnect + timeouty; w wariancie „moduł w
  bocie" izolować błędy, żeby nie wywróciły bota.

## Etapy

1. ✅ **Przygotowanie:** ten dokument, interfejs `RconClient`, placeholder w panelu, szkielet env.
2. ✅ **Faza 1:** protokół (`protocol.ts`/`evrimaClient.ts`) + status/lista graczy read-only;
   testy jednostkowe + mock (`mock:rcon`/`probe:rcon`) — zweryfikowane lokalnie.
3. ✅ **Faza 2 (strona bota):** komendy `game_*` (admin-gated, rejestrowane tylko gdy RCON w env) —
   `game_status`/`game_players`/`game_announce`/`game_save`/`game_kick`/`game_ban`; zadanie
   `gameAnnounce` na kolejce `botJob` (opcja `za_minut`). ⏳ Kalibracja protokołu czeka na realny serwer.
4. ✅ **Faza 3:** panel „Serwer gry" na żywych danych — bot pisze snapshot (`gameServerStatus`)
   do DB co 30 s, API/panel czytają (online/gracze/mapa), ogłoszenia in-game z panelu przez
   kolejkę (`gameAnnounce`, teraz/zaplanowane) + lista z anulowaniem. ⏳ Kalibracja protokołu
   nadal czeka na realny serwer.
5. ✅ **Faza 4 (UI preview):** panel pokazuje pełny zestaw akcji (ogłoszenie, kick/ban gracza,
   zapis/restart), ale **wyszarzone/zablokowane** („wkrótce"); status i lista graczy działają na
   żywo. Nav ma plakietkę „wkrótce". Backend akcji jest gotowy — odblokowanie = zdjęcie `disabled`
   - podpięcie istniejących endpointów/komend. Kalibracja protokołu czeka na realny serwer.
6. **Później:** odblokowanie akcji panelu po podłączeniu serwera; ew. wycięcie do osobnej usługi
   (kandydat na Go), kontrakt bez zmian.
