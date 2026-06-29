import { expect, test } from "@playwright/test";

/**
 * Bezpieczeństwo runtime: bez ważnego tokenu API zwraca 401, a panel MUSI
 * przekierować na stronę logowania ("/") zamiast pokazać dane serwera. Mock
 * po ścieżce (jak w web-vitals.inp.e2e.ts) — działa na prod-buildzie i dev.
 */
test("brak autoryzacji (401) → redirect na / zamiast pokazania dashboardu", async ({
  page,
}) => {
  // Każdy endpoint API zwraca 401 (jakby brak/wygasł token).
  await page.route(/\/(auth|guilds|bot|feedback)(\/|\?|$)/, (r) =>
    r.fulfill({
      status: 401,
      contentType: "application/json",
      body: '{"error":"Unauthorized"}',
    }),
  );

  await page.goto("/dashboard/123/automod", { waitUntil: "domcontentloaded" });

  // Panel (handleUnauthorized) ustawia window.location.href = "/" — odpytujemy
  // sam URL (odporne na wyścig nawigacji, w przeciwieństwie do waitForURL).
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).toBe("/");

  // Nie wyciekły dane serwera: brak nagłówka podstrony „Auto-moderacja".
  await expect(page.locator("h1", { hasText: /Auto-moderacja/i })).toHaveCount(0);
});
