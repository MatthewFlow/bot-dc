# Wdrożenie na Hostinger (hPanel)

> ⚠️ **WYMAGANY VPS.** Ten projekt to Discord bot + API (Hono) + Next.js (SSR) + MongoDB +
> Docker — czyli **procesy działające non-stop i Docker**. Działa to **wyłącznie na
> Hostinger VPS (KVM)**.
>
> **Hostinger Shared / Web Hosting / Cloud Hosting NIE uruchomi tego projektu** (środowisko
> PHP/statyczne, bez Bun/Node w tle, bez Dockera, bez własnego MongoDB). Jeśli masz taki
> plan — potrzebujesz VPS (najtańszy **KVM 1** wystarcza: ~4 GB RAM).
>
> Jak sprawdzić w hPanel: po lewej musisz mieć sekcję **„VPS"** (z IP serwera, „Dostęp SSH",
> „Firewall", wyborem systemu). Jeśli widzisz tylko „Hosting"/„Strony" → to nie VPS.

Cały stack i jego działanie opisuje [`DEPLOYMENT.md`](./DEPLOYMENT.md) — ten dokument to
**warstwa specyficzna dla Hostingera** (co wyklikać w hPanel).

---

## ⚡ Szybki start — Twój przypadek (VPS, bez domeny, SSH+firewall gotowe)

Masz już konsolę, firewall (porty 22/80/443) i SSH — więc zostaje **wrzucić pliki, uzupełnić
`.env` i odpalić**.

### A. Wrzuć pliki na VPS

Najprościej przez **Git** (czyste aktualizacje później). Z VPS (po SSH):

```bash
git clone <adres-repo> jurassic-haven && cd jurassic-haven
```

Repo prywatne? Użyj URL z tokenem: `https://<token>@github.com/<user>/<repo>.git`.

**Bez gita — wgranie z komputera (Windows):** użyj **WinSCP** (GUI) albo `scp`. Przeciągnij/
skopiuj cały katalog projektu, ale **BEZ `node_modules` i `.next`** (zależności instalują się
w obrazie Dockera). Przykład `scp` z PowerShella na Twoim PC:

```powershell
scp -r C:\Users\matth\Desktop\bot-dc root@IP_VPS:/root/jurassic-haven
```

> Upewnij się tylko, że trafią: `Dockerfile`, `docker-compose.yml`, `bun.lock`, `package.json`,
> katalogi `apps/`, `packages/`, `deploy/`. (`node_modules`/`.next` są zbędne i ciężkie.)

### B. Zainstaluj Docker (jeśli OS nie miał szablonu z Dockerem)

```bash
curl -fsSL https://get.docker.com | sh
```

### C. Konfiguracja — bez domeny

```bash
cd jurassic-haven
cp .env.production.example .env
nano .env
```

Bez domeny masz dwie opcje (szczegóły i przykłady są w komentarzach `.env`):

| | HTTPS? | Logowanie Discord | Ustawienia w `.env` |
|---|---|---|---|
| **Zalecane: nip.io** | ✅ darmowe | ✅ działa | `CADDY_SITE=<IP-z-myślnikami>.nip.io`, `PUBLIC_URL=https://<IP-z-myślnikami>.nip.io`, `COOKIE_SECURE=true` |
| Szybki podgląd: samo IP | ❌ HTTP | ⚠️ słabsze | `CADDY_SITE=:80`, `PUBLIC_URL=http://IP_VPS`, `COOKIE_SECURE=false` |

`nip.io` to darmowy DNS: host `203-0-113-5.nip.io` zawsze wskazuje na IP `203.0.113.5` — Caddy
pobierze dla niego **prawdziwy certyfikat HTTPS**, więc logowanie działa bez kupowania domeny.

Uzupełnij też: `JWT_SECRET` (`openssl rand -hex 32`), `MONGODB_URI` (zostaw domyślne),
`DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `GUILD_ID`.

W **Discord Developer Portal → OAuth2 → Redirects** dodaj dokładnie `<PUBLIC_URL>/api/auth/callback`
(np. `https://203-0-113-5.nip.io/api/auth/callback`).

### D. Odpal

```bash
docker compose up -d --build
```

Wejdź na `PUBLIC_URL` (panel) — np. `https://203-0-113-5.nip.io`. API: `<PUBLIC_URL>/api/health`.
Rejestracja komend bota: w `.env` `RESET_COMMANDS=true` → `docker compose up -d bot` → z powrotem
`false` → `docker compose up -d bot`.

> Pełne szczegóły (sekcje hPanel, DNS przy domenie, operacje, swap) — niżej.

---

## 1. VPS: system operacyjny

hPanel → **VPS** → Twój serwer → **System operacyjny** (OS & Panel):

- Wybierz **Ubuntu 24.04** (czysty). Jeśli na liście jest szablon **„Ubuntu z Docker"** —
  wybierz go, oszczędzisz krok instalacji Dockera.
- Po zmianie OS serwer się przeinstaluje (kilka minut) i ustawisz **hasło roota**.

## 2. Dostęp SSH

hPanel → **VPS** → **Dostęp SSH**: znajdziesz IP, port (22) i dane logowania.
Połącz się z komputera:

```bash
ssh root@TWOJE_IP_VPS
```

(W hPanel jest też **terminal w przeglądarce** — „Browser terminal" — jeśli wolisz.)

## 3. Firewall

hPanel → **VPS** → **Firewall**: utwórz/edytuj zestaw reguł i **zezwól na ruch przychodzący**:

| Port | Po co            |
| ---- | ---------------- |
| 22   | SSH              |
| 80   | HTTP (ACME/Caddy)|
| 443  | HTTPS            |

Przypisz zestaw reguł do VPS. (Bez 80/443 Caddy nie pobierze certyfikatu i strona nie wstanie.)

## 4. Domena i DNS

Potrzebujesz domeny wskazującej na IP VPS.

- **Domena kupiona w Hostingerze:** hPanel → **Domeny** → Twoja domena → **Strefa DNS (DNS Zone)**
  → dodaj/edytuj rekord **A**:
  - Typ `A`, Nazwa `@`, Wartość `IP_VPS`, TTL domyślny
  - (opcjonalnie) Typ `A`, Nazwa `www`, Wartość `IP_VPS`
- **Domena u innego rejestratora:** ustaw analogiczny rekord A u niego.

Propagacja DNS bywa do kilkudziesięciu minut. Sprawdź: `ping twojadomena.pl` → ma zwracać IP VPS.

> W Developer Portal Discorda (OAuth2 → Redirects) dodaj:
> `https://twojadomena.pl/api/auth/callback`

## 5. Docker (jeśli nie z szablonu)

Jeśli wybrałeś czysty Ubuntu bez Dockera — zainstaluj go po SSH:

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 6. Kod + konfiguracja + start

Po SSH na VPS:

```bash
# pobierz kod (HTTPS lub deploy key)
git clone <adres-repo> jurassic-haven
cd jurassic-haven

# konfiguracja produkcyjna
cp .env.production.example .env
nano .env            # uzupełnij DOMAIN, sekrety Discord, GUILD_ID
#   JWT_SECRET wygeneruj:
openssl rand -hex 32

# start całości
docker compose up -d --build
```

Caddy automatycznie pobierze certyfikat TLS. Po chwili:
**Panel:** `https://twojadomena.pl` · **API:** `https://twojadomena.pl/api/health`

### Rejestracja komend bota (pierwszy raz)

```bash
nano .env                          # RESET_COMMANDS=true
docker compose up -d bot
nano .env                          # z powrotem RESET_COMMANDS=false
docker compose up -d bot
```

## 7. Aktualizacje i operacje

```bash
git pull && docker compose up -d --build   # wdróż nową wersję
docker compose logs -f api                 # logi
docker compose ps                          # status
docker compose restart api                 # restart usługi
```

---

## Uwagi specyficzne dla Hostinger VPS

- **RAM przy buildzie:** `docker compose build` (zwłaszcza panel/Next.js) bywa pamięciożerny.
  Na małym VPS, jeśli build padnie z „killed"/OOM, dodaj swap:
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
- **Port 80/443 wolne:** czysty Ubuntu z Hostingera nie ma nic na 80/443 (Caddy zajmie je bez
  konfliktu). Nie instaluj równolegle nginx/Apache/OpenLiteSpeed na tym VPS.
- **Backup Mongo:** patrz `DEPLOYMENT.md` (sekcja „Baza danych") — wolumen `mongo-data`
  przeżywa restarty; rób okresowy `mongodump`.
- **Bezpieczeństwo:** rozważ logowanie po **kluczu SSH** zamiast hasła (hPanel → VPS → Dostęp SSH
  → klucze) i wyłączenie logowania hasłem.
