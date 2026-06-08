# Wdrożenie na VPS (Docker Compose)

Stack: **MongoDB + API + Bot + Panel + Caddy** (reverse proxy z automatycznym HTTPS).
Wszystko na jednej domenie — panel pod `/`, API pod `/api` (same-origin, bez problemów z CORS i ciasteczkami).

```
Internet ──▶ Caddy :443 (HTTPS) ──┬─ /api/* ─▶ api  :3002
                                  └─ /*     ─▶ panel:3000
                                              api+bot ─▶ mongo:27017
```

## Wymagania na VPS

- Docker + Docker Compose (plugin `docker compose`)
- Domena z rekordem **A** wskazującym na IP VPS
- Otwarte porty **80** i **443** (Caddy + ACME/Let's Encrypt)

## 1. Discord Developer Portal

1. **Bot** → skopiuj token → `DISCORD_TOKEN`
2. **OAuth2** → skopiuj `Client ID` i `Client Secret`
3. **OAuth2 → Redirects** → dodaj dokładnie:
   ```
   https://twojadomena.pl/api/auth/callback
   ```

## 2. Konfiguracja

```bash
git clone <repo> && cd bot-dc
cp .env.production.example .env
nano .env          # uzupełnij DOMAIN, sekrety Discord, JWT_SECRET, GUILD_ID
```

Wygeneruj `JWT_SECRET` (min. 32 znaki):

```bash
openssl rand -hex 32
```

> `.env` jest w `.gitignore` — trzyma sekrety, nie trafia do repo ani do obrazów Docker.
> `PANEL_URL`, `DISCORD_REDIRECT_URI` i `CORS_ORIGINS` są wyprowadzane z `DOMAIN` w `docker-compose.yml` — nie ustawiasz ich ręcznie.

## 3. Start

```bash
docker compose up -d --build
```

Caddy automatycznie pobierze certyfikat TLS dla `DOMAIN` (chwilę to trwa przy pierwszym starcie).
Panel: `https://twojadomena.pl` · API health: `https://twojadomena.pl/api/health`.

## 4. Rejestracja komend bota (pierwszy raz)

```bash
# w .env ustaw RESET_COMMANDS=true, potem:
docker compose up -d bot
# po starcie ustaw z powrotem RESET_COMMANDS=false i:
docker compose up -d bot
```

## Operacje

| Czynność            | Komenda                                    |
| ------------------- | ------------------------------------------ |
| Logi (na żywo)      | `docker compose logs -f api`               |
| Restart usługi      | `docker compose restart api`               |
| Aktualizacja kodu   | `git pull && docker compose up -d --build` |
| Stop (dane zostają) | `docker compose down`                      |
| Status              | `docker compose ps`                        |

## Baza danych

Domyślnie dane Mongo żyją w wolumenie `mongo-data` (przetrwają `down`/restart).
Kopia zapasowa:

```bash
docker compose exec mongo mongodump --archive=/data/db/backup.gz --gzip
docker compose cp mongo:/data/db/backup.gz ./backup-$(date +%F).gz
```

**MongoDB Atlas zamiast kontenera:** wpisz `MONGODB_URI=mongodb+srv://...` w `.env`
i usuń usługę `mongo` (oraz `depends_on: mongo`) z `docker-compose.yml`.

## Bezpieczeństwo (zastosowane)

- Sekrety wyłącznie w `.env` (gitignore) i przez `environment:` w compose — **nie** w obrazach (`.dockerignore` wyklucza wszystkie `.env*`).
- API startuje tylko z kompletem zmiennych i `JWT_SECRET` ≥ 32 znaki (fail-fast w produkcji).
- Token OAuth Discorda trzymany serwerowo (Mongo, TTL); JWT w ciasteczku **HttpOnly + Secure + SameSite=Lax**.
- Mongo bez `ports:` — niedostępne z internetu, tylko w sieci compose.
- Rate limiting per prawdziwe IP (`TRUST_PROXY=true` → X-Forwarded-For od Caddy).
- Autoryzacja per serwer (`isGuildAdmin`) na wszystkich trasach `/guilds/*`.

## Alternatywa: nginx zamiast Caddy

Jeśli wolisz nginx, podmień usługę `caddy` na obraz `nginx` z konfiguracją proxy
`/api/ → api:3002/` oraz `/ → panel:3000`, ustaw `proxy_set_header X-Forwarded-For`
i obsłuż TLS przez certbot. Caddy jest domyślny, bo daje HTTPS bez dodatkowej konfiguracji.
