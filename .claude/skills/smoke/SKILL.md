---
name: smoke
description: Build the panel and run a throwaway Playwright "page mounts" smoke test for a dashboard route (e.g. /autovoice, /giveaways). Catches runtime crashes (bad data shapes, broken imports, missing mocks) that typecheck/lint miss. Argument = the route path under /dashboard/[guildId].
---

Goal: confirm a panel page mounts with **no pageerror**, against a fully mocked API.

Steps:
1. Refresh the prod build (the e2e webServer runs `next start`): from `apps/panel`
   run `bun run build`. Never `next build` over a running `next dev` (corrupts `.next`).
2. Create a temporary `apps/panel/e2e/_diag.e2e.ts` that mocks the API by PATH
   (origin-independent) with this baseline, plus the page's own endpoints:
   - fallback regex `/\/(auth|guilds|bot)(\/|\?|$)/` → `{}`
   - `**/auth/me` → `{ userId:"1", username:"t", isOwner:false, avatar:null }`
   - `**/guilds` → `[{ id:"123", name:"Test", icon:null, permissions:"8" }]`
   - `**/guilds/*/config` → `{}`
   - channels (cover `?types=`): regex `/\/guilds\/[^/]+\/channels/` → array
   - `**/guilds/*/roles` → `[]`
   - `**/bot/status` → `{ online:true, username:"Bot", avatar:null, guildCount:1, lastSeen:new Date().toISOString() }`
   - `**/guilds/*/feedback` → `{ items:[], unread:0, seenAt:null }`
   - tickets: `/\/guilds\/[^/]+\/tickets(\?|$)/` → `[]`
   - mod-actions: `/\/guilds\/[^/]+\/mod-actions/` → `[]`
   Capture `page.on("pageerror", …)`, goto `/dashboard/123<route>`, wait for a
   stable element, assert no page errors and a key element is visible.
3. Run from `apps/panel`: `bunx playwright test e2e/_diag.e2e.ts`.
4. ALWAYS delete `apps/panel/e2e/_diag.e2e.ts` afterwards — it must not be committed.

Gotchas:
- The guild layout gates pages behind `GET /guilds`, so the mock list MUST contain
  guild id `123`, else the page shows AccessDenied and never mounts.
- The TopBar `NotificationBell` needs tickets + mod-actions mocked, or it throws
  ("object is not iterable") and crashes the whole layout.
- Use selectors by `title=` / role; `getByRole(name)` from a `title` attr can be flaky.
