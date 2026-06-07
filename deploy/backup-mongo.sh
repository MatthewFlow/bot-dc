#!/usr/bin/env bash
#
# Zrzut bazy MongoDB z kontenera Docker do pojedynczego, spakowanego pliku.
# Mongo nie ma wystawionego portu (tylko sieć compose), więc mongodump odpalamy
# WEWNĄTRZ kontenera, a archiwum przekierowujemy na dysk hosta.
#
# ── Uruchomienie (NA VPS, z katalogu repo gdzie jest docker-compose.yml) ──
#   ./deploy/backup-mongo.sh
#
# Powstaje plik:  backups/jurassic-haven-YYYY-MM-DD_HHMMSS.archive.gz
#
# ── Pobranie na swój komputer (z LOKALNEGO terminala / PowerShell) ──
#   scp <user>@<VPS_IP>:~/bot-dc/backups/jurassic-haven-*.archive.gz .
#
# ── Podgląd lokalnie (wymaga lokalnego Mongo + MongoDB Database Tools) ──
#   mongorestore --gzip --archive=jurassic-haven-XXXX.archive.gz
#   …a potem otwórz bazę w MongoDB Compass (mongodb://localhost:27017).
#
set -euo pipefail

# Wejdź do katalogu repo niezależnie od tego, skąd skrypt został odpalony.
cd "$(dirname "$0")/.."

OUT_DIR="backups"
mkdir -p "$OUT_DIR"

STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT_FILE="$OUT_DIR/jurassic-haven-$STAMP.archive.gz"
TMP_FILE="$OUT_FILE.partial"

echo "→ Tworzę zrzut MongoDB z kontenera 'mongo'..."

# exec -T  : bez TTY — działa też nieinteraktywnie (np. z crona).
# --archive: cała baza idzie na stdout jako jeden strumień (przekierowany do pliku).
# --gzip   : kompresja w locie.
# Zapis najpierw do .partial, dopiero po sukcesie zmiana nazwy — żeby przerwany
# backup nie zostawił uszkodzonego pliku wyglądającego na kompletny.
if docker compose exec -T mongo mongodump --archive --gzip > "$TMP_FILE"; then
  mv "$TMP_FILE" "$OUT_FILE"
else
  rm -f "$TMP_FILE"
  echo "✗ Backup nieudany. Jeśli błąd to 'mongodump: not found', odpal przez osobny" >&2
  echo "  obraz z narzędziami, np.:" >&2
  echo "  docker run --rm --network \$(docker compose ps -q mongo >/dev/null && echo <network>) ..." >&2
  exit 1
fi

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "✓ Gotowe: $OUT_FILE ($SIZE)"
echo
echo "Pobierz na swój komputer:"
echo "  scp <user>@<VPS_IP>:$(pwd)/$OUT_FILE ."
