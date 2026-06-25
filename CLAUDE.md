# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jurassic Haven** — a multi-tenant Discord bot platform with a web dashboard. A Bun monorepo
with three apps (`bot`, `api`, `panel`) and one shared package (`db`). All Discord access flows
through the bot/API; all persistence flows through `@jurassic-haven/db`.

## Tech Stack (current versions)

| Layer    | Stack                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| Runtime  | Bun (workspaces), TypeScript 6                                                                         |
| Bot      | discord.js 14, mongoose 9                                                                              |
| API      | Hono 4, jose 6 (JWT), zod 4, mongoose 9                                                                |
| Panel    | Next.js 16 (App Router), React 19, Tailwind 4, TanStack Query 5, Radix UI, sonner, zod 4, lucide-react |
| Database | MongoDB + Mongoose 9                                                                                   |
| Tooling  | ESLint 10 (flat config), Prettier 3, typescript-eslint 8                                               |

Bun loads `.env` automatically — there is **no `dotenv` dependency**. Each app reads its config
straight from `process.env`.

## Commands

```bash
bun install            # from repo root — installs all workspaces

# Run apps (separate terminals)
bun run bot            # apps/bot — production mode (bun run src/index.ts)
bun run api            # apps/api — production mode
bun run panel          # apps/panel — Next.js dev server
bun run dev            # all dev servers at once (bun --filter './apps/*' dev)

# Watch mode for a single app
cd apps/bot && bun run dev    # bun --watch
cd apps/api && bun run dev    # bun --watch

# Quality
bun test               # unit suite (bun:test)
bun run typecheck      # tsc per workspace (db, bot, api, panel)
bun run lint           # ESLint across the whole repo
bun run lint:fix       # ESLint --fix
bun run format         # Prettier write
bun run format:check   # Prettier check
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + test on every push to `main` and on PRs.
Unit tests cover pure logic (XP math, embed converter, config sanitization, guild access checks)
and live next to the module under test as `*.test.ts`.

## Repository layout

```
apps/
  bot/    — Discord bot (Bun + discord.js v14)
  api/    — REST API (Bun + Hono)
  panel/  — Web dashboard (Next.js 16 + React 19 + Tailwind 4)
packages/
  db/     — Shared database layer (MongoDB + Mongoose)
deploy/   — Caddyfile + MongoDB backup script (VPS deployment)
Dockerfile, docker-compose.yml, .env.production.example   — container deployment
tsconfig.base.json — strict compiler baseline extended by every workspace tsconfig
eslint.config.ts   — single flat config covering all workspaces
```

### TypeScript config

`tsconfig.base.json` is the strict baseline **every** workspace extends:
`strict`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUncheckedIndexedAccess`,
`noFallthroughCasesInSwitch`, `moduleDetection: force`, `module/target: ESNext`,
`moduleResolution: bundler`, `noEmit`. Because `verbatimModuleSyntax` is in the base,
**all** workspaces (including `panel` and `db`) must use `import type` for type-only imports —
enforced by the `@typescript-eslint/consistent-type-imports` lint rule.

- `apps/bot`, `apps/api` — add `types: ["node","bun"]`, `allowImportingTsExtensions`, and a
  path alias `@jurassic-haven/db` → `packages/db/index.ts`.
- `apps/panel` — overrides `target: ES2022`, DOM libs, `jsx: react-jsx`, the Next plugin, and a
  `@/*` → `src/*` alias.
- `packages/db` — adds `declaration` + `isolatedDeclarations`.

## Naming conventions

File names follow their **role**, consistently across the repo:

- **packages/db** — schemas `xxx.schema.ts`, repository interfaces `xxxRepository.ts`,
  Mongoose providers `xxxProvider.ts`; root modules camelCase (`client.ts`, `embed.ts`,
  `xpHelpers.ts`).
- **apps/api** — route modules are the bare resource noun in camelCase (`guilds.ts`,
  `buttonRoles.ts`, `gameServer.ts`, `auth.ts`) — **no** `Routes` suffix on the file (the
  exported router still ends in `Routes`, e.g. `gameServerRoutes`). `lib/` and `middleware/`
  are camelCase (`guildGuard.ts`, `authMiddleware.ts`).
- **apps/bot** — one directory per feature in camelCase (`buttonRoles/`, `serverLog/`,
  `gameServer/`, `levels/`, `tickets/`); files are camelCase, named after their job
  (`statusSweep.ts`, `voiceXp.ts`) or `handler.ts` for a feature's entry dispatcher.
- **apps/panel** — React components **PascalCase** (`NotificationBell.tsx`, `ConfirmModal.tsx`,
  `Toast.tsx`); the shadcn-style primitives in `components/ui/` stay lowercase intentionally
  (`button.tsx`, `dialog.tsx`). Hooks `useXxx.ts`, `lib/` camelCase.
- **Everywhere** — unit tests sit next to the module as `*.test.ts`; Playwright e2e as `*.e2e.ts`.
- **Not file names** — HTTP route paths (e.g. `/guilds/:id/gameserver/announce`) and per-guild
  module keys (e.g. `serverlog`) are part of the API/config contract and stay as-is regardless
  of file casing.

## packages/db — shared database layer

All MongoDB access goes through this package. Both `apps/bot` and `apps/api` depend on it as a
workspace dependency.

- `repositories/` — TypeScript interfaces + domain types only (e.g. `IGuildConfigRepository`)
- `providers/mongoose/` — Mongoose implementations of those interfaces
- `providers/mongoose/schemas/` — Mongoose schema definitions
- `providers/mongoose/providers.ts` — singleton instances exported as `guildConfigRepository`,
  `xpRepository`, `reactionRoleRepository`, `buttonRoleRepository`, `warnRepository`,
  `ticketRepository`, `modActionRepository`, `sessionRepository`, `feedbackRepository`,
  `botStatusRepository`
- `index.ts` — the single public export surface for the whole package
- `client.ts` — `connectDb()`, called once at app startup before any DB use
- `embed.ts` — shared `EmbedConfig` model + `toDiscordEmbed(cfg, sub?)` converter (one JSON shape
  used by both API REST sends and discord.js `embeds:[]`) + `isEmbedEmpty()`. `sub` substitutes
  template variables and is how `{user}`/`{server}`/`{avatar}` reach embeds.
- `xpHelpers.ts` — XP/level math and constants: `XP_PER_MESSAGE=15`, `XP_COOLDOWN_MS=5000`,
  `XP_PER_LEVEL=100`, `XP_SAVE_DEBOUNCE_MS=2000`, `XP_SYNCALL_DELAY_MS=350`, `XP_SLIDER_MAX=8`,
  `VOICE_XP_INTERVAL_MS=60000`; `levelFromXp(xp)`, `xpToNextLevel(xp)`, `clampSliderXp(v)`
  (rounds/clamps to 0..8), `messageXpFor(lvl)` (priority: flat `messageXp` → legacy
  `xpMultiplier × 15` → default 15).

Guild config (`guildConfig.schema.ts`) holds all per-server settings: welcome/goodbye channels &
messages, `joinRoleId`/`verifiedRoleId`, `roleRewards[]`, mod-log/ticket-log/feedback channels,
`adminRoleId`, ticket support roles, `disabledCommands[]`, and nested config objects
`autoMod`, `serverLog`, `leveling`. Editable embeds are stored as `EmbedConfig`: `welcomeEmbed`,
`goodbyeEmbed`, `ticketPanelEmbed`, `feedbackPanelEmbed`, `levelUpEmbed`, plus `ticketPanelButton`
(`{ label?, emoji? }`). When an embed is set the bot uses it; otherwise it falls back to the
legacy text message / built-in default.

## apps/bot — Discord bot

Entry: `src/index.ts` → `connectDb()` → `createBot()` in `src/bot.ts` → `client.login(token)`.

- **Env** (`src/config/env.ts`): `DISCORD_TOKEN` (required, throws if missing), `GUILD_ID`
  (optional — only used to clear stale guild-scoped commands). Also reads `MONGODB_URI` (via db),
  `PANEL_URL` (intro message), `CFG_ADMIN_ROLE_ID` (legacy admin fallback), `RESET_COMMANDS`.
- **Commands** register **globally** via `src/commands/register.ts` (global pool avoids the
  per-guild daily limit; idempotent PUT). Set `RESET_COMMANDS=true` and restart to clear global +
  guild-scoped commands, then set it back.
- **Command naming**: user (`/level`, `/leaderboard`, `/profile`, `/feedback`), admin config
  (`/cfg_*`), moderation (`/mod_*`), tickets (`/ticket_*`), tests (`/test_*`).
- **Dispatch** (`src/commands/handlers/handler.ts`): routes via a `Record<string, Handler>` map to
  `user.ts`, `admin.ts`, `mod.ts`, `test.ts`, and `tickets/handler.ts`. Before dispatch it (1)
  rejects commands listed in the per-guild `disabledCommands` array (read through the 15s config
  cache; commands are registered globally so disabling is a runtime gate), then (2) guards
  restricted commands (`cfg_*`, `mod_*`, `test_*`, `ticket_setup`, `ticket_delete`) via
  `guard.ts` `requireAdminRole`. `ticket_close`/`ticket_add` are gated by private-thread
  membership instead. A member passes the guard with the native Discord **Administrator**
  permission, the per-guild `adminRoleId`, or the legacy global `CFG_ADMIN_ROLE_ID` — failure
  replies ephemerally.
- **Gateway intents**: `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`,
  `GuildMessageReactions`, `GuildVoiceStates`. Partials: `Message`, `Reaction`, `User` — always
  fetch partials before processing in reaction handlers.
- **Events** (wired in `bot.ts`): `guildCreate`/`guildDelete` (onboarding — intro embed on join
  via `PANEL_URL`, config retained on leave), `guildMemberAdd`/`Remove` (welcome/goodbye +
  auto-role), `messageCreate` (XP + automod), `messageReactionAdd`/`Remove` (reaction roles),
  `threadUpdate`/`threadDelete` (ticket state sync). Server-log listeners
  (`messageDelete`/`messageUpdate`/`guildMemberAdd`/`Remove`/`guildMemberUpdate`) are registered
  separately so logging stays decoupled.
- **Levels subsystem**: `src/levels/award.ts` (`applyLevelProgress`) is the shared post-XP path —
  assigns progression roles (`autorole.ts`) and fires level-up notifications
  (`levelUpNotify.ts`). XP comes from two sources, both honouring `leveling.noXpChannelIds`/
  `noXpRoleIds`: messages (`messageCreate`, amount via `messageXpFor`, 5s cooldown) and voice
  presence (`src/levels/voiceXp.ts` — a 60s sweep grants `leveling.voiceXp` per minute to eligible
  members in voice longer than one minute; skips bots, the AFK channel, and self-muted/deafened).
  `leveling` config (dashboard `levels` page): flat `messageXp`/`voiceXp` sliders (0–8, legacy
  `xpMultiplier` still honoured when `messageXp` unset), no-XP channels/roles, and level-up
  toggles (`levelUpEnabled` channel post, `levelUpDm`). The level-up message is a customizable
  `levelUpEmbed` with variables `{user} {username} {server} {level} {role} {avatar}`; falls back
  to a built-in embed.
- **Moderation**: `/mod_*` handlers in `src/commands/handlers/mod.ts`; every action persists to
  `modActionRepository` and is posted via `src/modlog.ts` to `modLogChannelId`.
- **Auto-moderation** (`src/automod/automod.ts`): runs on `messageCreate` (config read through the
  15s in-memory cache `src/utils/configCache.ts`). Filters: invites, links, banned words,
  anti-spam (N messages / T seconds). Exempts staff (Administrator/Manage Server/Manage Messages)
  plus configured roles/channels. Action `delete`/`warn`/`mute` reuses `sendModLog` with the bot
  as moderator. Off unless `autoMod.enabled`.
- **Server logging** (`src/serverlog/serverlog.ts`): posts events (message delete/edit, member
  join/leave, role/nickname changes) to `serverLog.channelId` when `serverLog.enabled` and the
  per-category toggle is on. Uses the same 15s cache; honours `exemptRoleIds`/`exemptChannelIds`.
  For deletions it best-effort consults the audit log (needs View Audit Log) to show who deleted.
- **Tickets** (`src/tickets/handler.ts`): `/ticket_setup` posts the panel embed+button (from
  `ticketPanelEmbed`/`ticketPanelButton`, `custom_id: ticket_open`); the button opens a modal →
  private thread (`pending`) → support-role ping → "claim" button. `src/tickets/log.ts` logs
  open/close/delete to `ticketLogChannelId`.
- **Button roles** (`src/buttonroles/handler.ts`): published from the dashboard as an embed with
  up to 25 buttons, each `custom_id` = `br:<roleId>`, so a click toggles that role with **no DB or
  cache lookup**. Dispatched in `bot.ts`'s button branch alongside `ticket_open`/`ticket_claim`/
  `feedback_open`. Coexists with reaction roles (`messageReactionAdd`/`Remove`), whose lookups are
  cache-gated through `src/utils/reactionRoleCache.ts` (60s per-guild set of panel message IDs).
- **Verification flow**: `joinRoleId` (unverified) is given to every new member; `verifiedRoleId`
  is the complement. When a member gains `verifiedRoleId` via reaction roles the bot removes
  `joinRoleId`. `cfg_syncverify` assigns `joinRoleId` to members who have neither role.
- **Feedback** (`src/feedback/feedback.ts`): one shared submit path backs both the `/feedback`
  command and the feedback panel button (`custom_id: feedback_open` → modal). Submissions persist
  via `feedbackRepository` (with `guildId`) and, when `feedbackChannelId` is set, post there as an
  embed.
- **Bot status heartbeat**: on ready and every 30s, `bot.ts` writes a heartbeat to
  `botStatusRepository` (tag, avatar, guild count). The API marks the bot offline if the last beat
  is older than 90s.
- **Welcome/goodbye variables**: `{user}` → mention, `{username}` → name, `{server}` → guild name,
  `{member_count}` → count, `{avatar}` → avatar URL. Substitution lives in `src/utils/embedVars.ts`.
- Adding a slash command: define in `src/commands/register.ts` → add a handler → register it in
  the dispatch map in `handler.ts`.

## apps/api — REST API

Entry: `src/index.ts`. Port: `API_PORT` (default 3002). Framework: Hono with typed context
variables (`AppVariables` in `types.ts`).

- **Auth**: Discord OAuth2 → JWT (jose), delivered as an **HttpOnly + Secure cookie** (`jh_token`);
  the panel calls with `credentials: include`. The JWT payload carries `userId`, `username`,
  `avatar` only. The Discord OAuth access token is stored **server-side** in MongoDB
  (`sessionRepository`, TTL-indexed) via `src/lib/sessions.ts` — survives restarts, shared across
  instances, never in the JWT. `COOKIE_SECURE` forces the Secure flag (auto-on in production).
- `authMiddleware.ts` verifies the JWT (from `Authorization: Bearer` or cookie), looks up the
  session store for the access token, and populates Hono context variables.
- **CORS** origins come from `CORS_ORIGINS` (comma-separated → falls back to `PANEL_URL` → localhost);
  credentials enabled, so a specific origin is echoed, never `*`.
- **Rate limiting** (`src/middleware/rateLimit.ts`): global per-IP (`120 / 10s`), stricter on
  `/auth/*` (`20 / 60s`) and `/feedback` POST (`10 / 60s`). `TRUST_PROXY=true` makes it read
  `X-Forwarded-For` behind a reverse proxy.
- **Production fail-fast**: when `NODE_ENV=production`, the API exits at startup if any of
  `JWT_SECRET`, `MONGODB_URI`, `DISCORD_CLIENT_ID/SECRET`, `DISCORD_REDIRECT_URI`, `DISCORD_TOKEN`,
  `PANEL_URL` is missing, or if `JWT_SECRET` is shorter than 32 chars.
- **Routes**:
  - `src/routes/authRoutes.ts` — `/auth/discord` starts OAuth2; `/auth/callback` exchanges the
    code, sets `jh_token`, redirects to `PANEL_URL/auth/success`; `/auth/me` returns the JWT user;
    `/auth/logout`.
  - `src/routes/guilds.ts` (auth + per-guild admin guard on `/:guildId/*`):
    `GET /guilds` (user's admin guilds via Discord OAuth, cached per-token 5 min with request
    dedup in `guildGuard.ts`); `GET/PUT /:guildId/config` (PUT uses the `CONFIG_ALLOWED_FIELDS`
    allowlist then `sanitizeConfigPatch` to validate/clamp — unknown fields dropped);
    `GET/POST /:guildId/channels` and `/roles` (list/create via bot token);
    `GET /:guildId/leaderboard` (XP enriched via `memberResolver`); `GET /:guildId/stats`
    (member/online/ban/warn/ticket counts, each best-effort); `POST /:guildId/ticket-panel` and
    `POST /:guildId/feedback-panel` (send the configured embed+button to a channel);
    `GET/POST/DELETE /:guildId/feedback[...]` (server feedback list with unread count, mark-seen,
    delete).
  - `src/routes/reactionRoles.ts`, `src/routes/buttonRoles.ts` — reaction/button role CRUD; POST
    builds the embed (full `EmbedConfig` or legacy title/content/color) + components, sends to
    Discord, then persists; button-role POST returns the created record for optimistic UI.
  - `src/routes/moderation.ts` (guild-admin guarded): `GET/DELETE /:guildId/warnings/:userId`,
    `GET /:guildId/mod-actions`, `GET /:guildId/tickets` (enriched), `POST
/:guildId/tickets/:threadId/close|reopen`.
  - `src/routes/feedback.ts` (auth-only, not guild-gated): `POST /feedback` (author from JWT,
    category/rating/message validated), `GET /feedback/mine`.
  - `src/routes/status.ts` (auth-only): `GET /bot/status` — online if the last heartbeat is
    fresher than 90s, plus tag/avatar/guild count/last seen.
  - `src/routes/admin.ts` (auth + `ownerGuard`): `GET /admin/overview` — owner-only aggregate of
    every guild the bot is in (live from Discord: name/icon/member count + resolved owner) plus
    totals. `src/lib/ownerGuard.ts` gates on `OWNER_DISCORD_IDS`. Panel page: `/dashboard/admin`.
  - `GET /health`.
- **Channel guard**: endpoints that post to a `channelId` from the request body or config
  (ticket-panel, feedback-panel, reaction/button roles) first verify the channel belongs to the
  path guild via `channelInGuild` (`src/lib/channelGuard.ts`, fail-closed) — stops an admin of one
  guild from making the bot post into another.
- Both the user OAuth token (guild list) and the bot token (channels, roles, leaderboard, stats,
  panels, ...) are used, so the API also needs `DISCORD_TOKEN`.

## apps/panel — Web dashboard

Next.js 16 App Router; all dashboard pages are client components (`"use client"`).

- **Auth**: token stored in `localStorage` as `jh_token`; on 401 the client clears it and redirects
  to `/`.
- **Data layer**: `src/lib/api.ts` is the typed `fetch` client (retry on 429,
  `TokenExpiredError` on 401, shared `queryKeys`). Reads run through **TanStack Query** hooks in
  `src/hooks/queries.ts` (`useGuildConfig`, `useChannels`, `useRoles`, `useLeaderboard`,
  `useTickets`, `useModActions`, `useReactionRoles`, `useButtonRoles`, `useGuildFeedback`); the
  `QueryProvider` (`src/components/QueryProvider.tsx`) wraps the app and includes devtools.
  Validation schemas live in `src/lib/schemas.ts` (zod). Toasts via `sonner`
  (`src/components/toast.tsx`).
- **Routes**: `/` (landing), `/auth/success` (OAuth2 callback, saves JWT), `/dashboard` (guild
  list), `/dashboard/[guildId]/*` (per-server pages).
- **Dashboard sections** (`src/lib/nav.ts`): overview (stat cards + live bot status badge), pinned
  top items **Dashboard** + **Feedback**, then grouped nav — Onboarding (`welcome`, `autorole`,
  `roles` = unified Self-Roles for buttons **and** reactions), Community (`levels`, `tickets`),
  Security (`moderation`, `automod`, `serverlog`), System (`commands`, `settings`).
- **Layout**: each server page renders under `TopBar.tsx` (sticky breadcrumb + user menu +
  `NotificationBell`) and `Sidebar.tsx`; both read the shared nav map. Icons via `lucide-react`.
- **Embed editor**: `src/components/EmbedEditor.tsx` + `EmbedPreview.tsx` (live Discord-style
  preview), shared across welcome/goodbye, ticket panel, feedback panel and self-roles. Helpers in
  `src/lib/embed.ts` (color hex↔int, variable lists, `previewReplacer`). Avatars/guild icons render
  via `next/image` (`cdn.discordapp.com` whitelisted in `next.config.ts`).
- **Create helpers**: `CreateChannelButton.tsx` / `CreateRoleButton.tsx` (both built on
  `CreateEntityButton.tsx`) call the POST channels/roles endpoints inline next to selects
  (`ChannelSelect`/`RoleSelect`, built on `EntitySelect.tsx`).
- **Auto-save**: config pages use `hooks/useAutoSave.ts` — a debounced hook that persists changes
  automatically (baselines the loaded value so it never re-saves on load); `SaveButton` remains as
  an explicit manual save. Self-roles publishing posts to Discord and stays manual, updating its
  published list optimistically with rollback on failure.

## Environment Variables

| App   | Variable                   | Purpose                                                                             |
| ----- | -------------------------- | ----------------------------------------------------------------------------------- |
| bot   | `DISCORD_TOKEN`            | Bot token (required)                                                                |
| bot   | `GUILD_ID`                 | Guild used only to clear stale guild-scoped commands on reset                       |
| bot   | `PANEL_URL`                | Panel URL shown in the onboarding intro message                                     |
| bot   | `CFG_ADMIN_ROLE_ID`        | Legacy fallback admin role (prefer native Administrator or per-guild `adminRoleId`) |
| bot   | `RESET_COMMANDS`           | Set `true` once to clear & re-register slash commands                               |
| bot   | `DEEPL_API_KEY`            | DeepL free-tier key for auto-translation (optional — feature no-ops if unset)       |
| api   | `API_PORT`                 | API port (default 3002)                                                             |
| api   | `DISCORD_TOKEN`            | Bot token — proxies channel/role/leaderboard/stats/panel requests                   |
| api   | `DISCORD_CLIENT_ID/SECRET` | OAuth2 credentials                                                                  |
| api   | `DISCORD_REDIRECT_URI`     | OAuth2 callback URL                                                                 |
| api   | `JWT_SECRET`               | HS256 signing key (≥ 32 chars in production)                                        |
| api   | `PANEL_URL`                | OAuth2 redirect target + CORS fallback origin (default `http://localhost:3000`)     |
| api   | `CORS_ORIGINS`             | Comma-separated allowed browser origins (falls back to `PANEL_URL`)                 |
| api   | `COOKIE_SECURE`            | Force the Secure flag on the auth cookie (auto-on in production)                    |
| api   | `TRUST_PROXY`              | Trust `X-Forwarded-For` for rate limiting behind a reverse proxy                    |
| api   | `OWNER_DISCORD_IDS`        | Comma-separated Discord user IDs allowed into the owner panel (`/admin/overview`)   |
| both  | `MONGODB_URI`              | MongoDB connection string                                                           |
| both  | `NODE_ENV`                 | `production` enables fail-fast checks (api) and prod behaviour                      |
| panel | `NEXT_PUBLIC_API_URL`      | API base URL, baked into the bundle at build (default `http://localhost:3002`)      |

No secrets are committed — `.env*` files are git-ignored; `*.env.example` and
`.env.production.example` contain only placeholders (example IPs use the reserved TEST-NET range).
Per-app `.env.example` files document the variables each app actually reads.
