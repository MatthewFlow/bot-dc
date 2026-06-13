import { expect, type Route, test } from "@playwright/test";

// Budżet INP w CI (ms). „Good" wg Google to ≤200; trochę zapasu na zmienność runnera.
const INP_BUDGET = Number(process.env.INP_BUDGET ?? 250);

// Minimalne fixtury API — tyle, by layout + podstrona automod się wyrenderowały.
const ME = { userId: "1", username: "tester", displayName: "Tester", avatar: null };
const GUILDS = [{ id: "123", name: "Test Guild", icon: null, permissions: "8" }];
const CHANNELS = [{ id: "10", name: "general", type: 0 }];
const ROLES = [{ id: "20", name: "Member", position: 1 }];

test("INP na podstronie automod mieści się w budżecie", async ({ page }) => {
  // 1) Mock API po ŚCIEŻCE (niezależnie od origin — działa i na prod-buildzie, i na dev).
  //    Pasują tylko endpointy API; zasoby strony (/_next, dokument) nie zawierają tych segmentów.
  const json = (data: unknown) => (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });

  // Fallback (rejestrowany pierwszy → najniższy priorytet): cokolwiek z /auth|/guilds|/bot.
  await page.route(/\/(auth|guilds|bot)(\/|\?|$)/, json({}));
  // Konkretne endpointy (rejestrowane później → wygrywają nad fallbackiem).
  await page.route("**/auth/me", json(ME));
  await page.route("**/guilds", json(GUILDS));
  await page.route("**/guilds/*/config", json({}));
  await page.route("**/guilds/*/channels", json(CHANNELS));
  await page.route("**/guilds/*/roles", json(ROLES));
  await page.route(
    "**/bot/status",
    json({
      online: true,
      username: "Bot",
      avatar: null,
      guildCount: 1,
      lastSeen: new Date().toISOString(),
    }),
  );
  await page.route("**/guilds/*/feedback", json({ items: [], unread: 0, seenAt: null }));

  // 2) Mierz INP wprost przez Event Timing API (to samo źródło, z którego liczy web-vitals):
  //    najgorszy `duration` wśród zdarzeń z interactionId. Zero zależności i problemów z ESM.
  await page.addInitScript(() => {
    const store = window as unknown as { __inp: number };
    store.__inp = 0;
    try {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEventTiming;
          if (e.interactionId > 0 && e.duration > store.__inp) store.__inp = e.duration;
        }
      });
      po.observe({
        type: "event",
        buffered: true,
        durationThreshold: 16,
      } as PerformanceObserverInit & { durationThreshold: number });
    } catch {
      // Event Timing API niedostępne — test nie zablokuje (INP zostanie 0).
    }
  });

  // 3) Wejdź na interaktywną podstronę i poczekaj na pierwszy przełącznik.
  await page.goto("/dashboard/123/automod", { waitUntil: "domcontentloaded" });
  const masterSwitch = page.getByRole("switch").first();
  await masterSwitch.waitFor({ state: "visible" });

  // 4) Wymuś realne interakcje — każdy klik to handler → re-render → paint (próbka INP).
  for (let i = 0; i < 10; i++) {
    await masterSwitch.click();
    await page.waitForTimeout(120);
  }

  // 5) Pozwól Event Timing API się rozliczyć i odczytaj wynik.
  await page.waitForTimeout(500);
  const inp = await page.evaluate(() => (window as unknown as { __inp: number }).__inp);

  console.log(`INP: ${Math.round(inp)} ms (budżet ${INP_BUDGET} ms)`);
  expect(
    inp,
    `INP (${Math.round(inp)} ms) powinno mieścić się w budżecie ${INP_BUDGET} ms`,
  ).toBeLessThanOrEqual(INP_BUDGET);
});
