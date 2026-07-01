import { expect, type Route, test } from "@playwright/test";

/**
 * Regres i18n: po wymuszeniu PL przełącznik języka zmienia etykiety nawigacji na
 * angielskie i utrwala wybór — lokalnie (localStorage) oraz na koncie
 * (PUT /me/preferences). Mock API po ścieżce (jak web-vitals.inp.e2e.ts).
 */
const GUILD = "123";
const ME = { userId: "1", username: "tester", displayName: "Tester", avatar: null };
const GUILDS = [{ id: GUILD, name: "Test Guild", icon: null, permissions: "8" }];

const json = (data: unknown) => (route: Route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  });

test("przełącznik języka zmienia nav PL→EN i zapisuje do konta", async ({ page }) => {
  let putBody: unknown = null;

  await page.route(/\/guilds\/[^/]+\/events/, (r) => r.abort());
  await page.route(/\/(auth|guilds|bot)(\/|\?|$)/, json({}));
  await page.route("**/auth/me", json(ME));
  await page.route("**/guilds", json(GUILDS));
  await page.route("**/guilds/*/config", json({}));
  await page.route("**/guilds/*/channels", json([]));
  await page.route("**/guilds/*/roles", json([]));
  await page.route("**/guilds/*/stats", json({ tickets: { total: 0 }, trends: {} }));
  await page.route(
    "**/bot/status",
    json({ online: false, guildCount: 0, lastSeen: null }),
  );
  // GET zwraca brak preferencji (null) → detekcja; PUT przechwytujemy.
  await page.route("**/me/preferences", (route) => {
    if (route.request().method() === "PUT") {
      putBody = route.request().postDataJSON();
      return json({ ok: true })(route);
    }
    return json({ lang: null })(route);
  });

  // Wymuś start PL (zapamiętany wybór wygrywa nad detekcją systemu) — inaczej
  // locale przeglądarki Playwright (en-US) wykryłoby EN i test byłby niedeterministyczny.
  await page.addInitScript(() => localStorage.setItem("jh_lang", "pl"));

  await page.goto(`/dashboard/${GUILD}/automod`, { waitUntil: "domcontentloaded" });

  // Sidebar po polsku (sekcja „Społeczność" + pozycja „Kanały głosowe").
  const sidebar = page.locator("aside").first();
  await expect(sidebar.getByText("Społeczność")).toBeVisible();
  await expect(sidebar.getByText("Kanały głosowe")).toBeVisible();

  // Przełącz na EN (przycisk z tytułem „English"; tekst przycisku to „en").
  await page.locator('button[title="English"]').click();

  // Etykiety po angielsku.
  await expect(sidebar.getByText("Community")).toBeVisible();
  await expect(sidebar.getByText("Voice channels")).toBeVisible();
  await expect(sidebar.getByText("Społeczność")).toHaveCount(0);

  // Zapis do konta poleciał z poprawnym językiem.
  await expect.poll(() => putBody).toEqual({ lang: "en" });

  // localStorage trzyma wybór per-urządzenie.
  expect(await page.evaluate(() => localStorage.getItem("jh_lang"))).toBe("en");
});
