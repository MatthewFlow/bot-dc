import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright służy tu wyłącznie do pomiaru INP (Interaction to Next Paint) na realnej
 * podstronie dashboardu — w prawdziwym Chromium, z prawdziwymi zdarzeniami wejścia.
 * API jest mockowane w teście (route), więc nie potrzeba ani bazy, ani logowania.
 *
 * Wymaga zbudowanego panelu (`bun run build`) — `webServer` odpala `next start` na :3000.
 */
// Port konfigurowalny (PW_PORT) — pozwala mierzyć prod-build na wolnym porcie obok dev:3000.
const PORT = Number(process.env.PW_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  // Pliki *.e2e.ts (nie *.spec/*.test) — by `bun test` (unit) ich nie podchwycił.
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
