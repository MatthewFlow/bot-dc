# Roadmap — Jurassic Haven

> Stan: 2026-06-21. Backlog „do przemyślenia" — pozycje nie są zatwierdzone.
> Koszt: **S** = dni, **M** ≈ tydzień, **L** = tygodnie.

Większość pozycji to świadomie odłożone elementy z serii redesignów panelu
(Centrum moderacji, Auto-moderacja, Logi serwera, Ustawienia, Dashboard, tickety).

---

## 🔑 Fundament + głęboka integracja bot↔panel

> Dziś akcje z panelu lecą bezpośrednio do Discord REST bot-tokenem, z pominięciem
> żywego klienta bota (jego cache członków, hierarchii ról, komponentów). To ogranicza
> głębię integracji — fundamentem jest kolejka zadań.

| Funkcja | Koszt | Korzyści | Minusy / ryzyko vs teraz |
|---|---|---|---|
| **Kolejka zadań bot↔panel** (`botJob`) | L | Bezpieczne złożone akcje z panelu (ogłoszenia, masowe role, struktury kanałów) z kontrolą hierarchii bota; realny status „w trakcie/błąd" | Nowy IPC + kolekcja, bot obsługuje joby (poll/retry/idempotencja), opóźnienie vs bezpośredni REST, więcej stanów błędów |
| **Custom commands / auto-respondery** | L | Największe „rozbudowanie" — serwery tworzą własne komendy bez kodu; retencja | Złożoność (limity, anty-pętla, mentions), obciążenie na każdym `messageCreate`, ryzyko nadużyć |
| **Kompozytor + scheduler embedów** | M | Tanie (reużywa `EmbedEditor`); ogłoszenia, cykliczne, przypomnienia | Scheduler = job/cron w bocie, strefy czasowe, zależy od kolejki zadań |

## ✅ Domknięcia odłożonych rzeczy

| Funkcja | Koszt | Korzyści | Minusy / ryzyko vs teraz |
|---|---|---|---|
| **Historia statystyk → wykresy + trend członków** | M | Domyka dashboard (sparkline'y, przyrost członków), dane do decyzji | Nowa kolekcja + zapis cykliczny (więcej writes/storage), agregacja/TTL |
| **Kary czasowe z auto-wygasaniem** | M | Domyka Centrum moderacji, automatyzacja, mniej ręcznej roboty | Sweep/scheduler w bocie, edge case'y (user wyszedł, rola usunięta) |
| **Transkrypty ticketów** | M | Duża wartość dla ekip, dowody/audyt | Generowanie i przechowywanie plików (storage), rate-limity pobierania, RODO |
| **Strefa zagrożenia** (reset / usuń dane) | S–M | Porządek, RODO, „leave clean" | Nieodwracalne — ryzyko pomyłki, wymaga mocnych zabezpieczeń |
| **Licznik „komend dziś"** | S | Domyka kartę „Informacje o bocie" | Inkrement w dispatcherze (minimalny), reset dobowy |

## ➕ Rozszerzenia funkcji

| Funkcja | Koszt | Korzyści | Minusy / ryzyko vs teraz |
|---|---|---|---|
| **Giveawaye** | M | Popularny, mocno „panelowy" feature | Stanowy (timer/losowanie), wrażliwy na restart bota |
| **Select-menu role + panel weryfikacji / menu-hub** | M | Dopełnia self-roles i onboarding | Kolejne typy paneli do utrzymania |
| **Pełny profil członka** (live + historia) | M | Świetne narzędzie mod, wszystko w jednym | Więcej zapytań do Discorda (rate-limity) |
| **Decay ostrzeżeń + audyt zmian w panelu** | S–M | Czystsza moderacja; accountability (kto zmienił config — ważne multi-tenant) | Dodatkowa kolekcja/logika, więcej zapisów |
| **Więcej filtrów automod** (mass-mention, CAPS, raid) | M | Lepsza ochrona | Więcej reguł = więcej fałszywych trafień do strojenia |
| **Toggle modułów per serwer** | S–M | Elastyczność, mniej szumu | Rozbudowa configu + bramki w bocie do przetestowania |

## ⚙️ Platforma / niezawodność

| Funkcja | Koszt | Korzyści | Minusy / ryzyko vs teraz |
|---|---|---|---|
| **Real-time (SSE/WebSocket)** | M–L | Żywy panel (natychmiastowe ticket/feedback/mod) | Nowy transport, utrzymanie połączeń/reconnect, skalowanie; obecny polling jest prosty i wystarcza |
| **Health/metryki + Sentry, backup/restore** | M | Stabilność, szybsze wykrywanie błędów, bezpieczeństwo danych | Dodatkowa infra/koszt utrzymania |
| **i18n PL/EN** | L | Zasięg/rynek, profesjonalizm | Ogromna powierzchnia (każdy string), utrzymanie tłumaczeń, ryzyko regresji |
| **Sharding** | L | Skala (tysiące serwerów) | Przedwczesne teraz — duża złożoność bez realnej potrzeby |

---

## Wspólny minus (dla wszystkiego)

Każda pozycja **dokłada kod, stan i punkty awarii** — obecna wersja jest prostsza
i lżejsza w utrzymaniu. Im więcej automatyzacji (schedulery, kolejki, real-time),
tym więcej obciążenia DB i scenariuszy brzegowych do ogarnięcia.

## Rekomendowana kolejność

1. **Kolejka zadań** (fundament — odblokowuje resztę),
2. **Kompozytor + scheduler embedów** (tani, widoczny efekt, korzysta z fundamentu),
3. **Historia statystyk** + **kary czasowe** (domknięcia),
4. potem **custom commands** i **real-time** jako większe skoki.
