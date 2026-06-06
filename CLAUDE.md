# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Jurassic Haven** — a Discord bot platform with a web dashboard. Bun monorepo with three apps and one shared package.

## Commands

### Install

```bash
bun install          # from repo root, installs all workspaces
```

### Run apps (separate terminals)

```bash
bun run bot          # apps/bot — production mode
bun run api          # apps/api — production mode
bun run panel        # apps/panel — Next.js dev server

# Or run all dev servers at once:
bun run dev
```

### Dev mode (watch)

```bash
cd apps/bot && bun run dev    # bun --watch
cd apps/api && bun run dev    # bun --watch
```

### Test & Typecheck

```bash
bun test               # run the unit test suite (bun:test)
bun run typecheck      # tsc --noEmit for bot, api and panel
```

### Lint & Format

```bash
bun run lint           # ESLint across entire repo
bun run lint:fix       # Auto-fix ESLint errors
bun run format         # Prettier write
bun run format:check   # Prettier check
```

CI (`.github/workflows/ci.yml`) runs lint + typecheck + test on every push to `main` and on PRs.
Unit tests cover pure logic (XP math, embed converter, config sanitization, permission checks);
add `*.test.ts` next to the module under test.

> ESLint obejmuje wszystkie workspace'y łącznie z `apps/panel`. Konfiguracja w `eslint.config.ts` (root). `apps/bot` i `apps/api` mają włączone `verbatimModuleSyntax`, więc importy typów **muszą** używać `import type`.

## Architecture

```
apps/
  bot/    — Discord bot (Bun + discord.js v14)
  api/    — REST API (Bun + Hono)
  panel/  — Web dashboard (Next.js 16 + React 19 + Tailwind 4)
packages/
  db/     — Shared database layer (MongoDB + Mongoose)
```

### packages/db — shared database layer

All MongoDB access goes through this package. Structure:

- `repositories/` — TypeScript interfaces only (e.g. `IGuildConfigRepository`)
- `providers/mongoose/` — Mongoose implementations of those interfaces
- `providers/mongoose/schemas/` — Mongoose schema definitions
- `providers/mongoose/providers.ts` — singleton instances exported as `xpRepository`, `guildConfigRepository`, `reactionRoleRepository`, `warnRepository`, `ticketRepository`, `modActionRepository`, `sessionRepository`, `feedbackRepository`
- `index.ts` — single public export surface for the whole package
- `embed.ts` — shared `EmbedConfig` model + `toDiscordEmbed(cfg, sub?)` converter (one JSON shape used by both the API REST send and discord.js `embeds:[]`) + `isEmbedEmpty()`. `sub` substitutes template variables and is how `{user}`/`{server}`/`{avatar}` reach embeds
- `xpHelpers.ts` — XP/level math: `XP_PER_MESSAGE=15`, `XP_COOLDOWN_MS=5000`, `XP_PER_LEVEL=100`, `XP_SAVE_DEBOUNCE_MS=2000`, `XP_SYNCALL_DELAY_MS=350` (bulk sync throttle), `levelFromXp(xp)`, `xpToNextLevel(xp)`
- `client.ts` — `connectDb()` — call once at app startup before any DB use

Guild config stores editable embeds as `EmbedConfig`: `welcomeEmbed`, `goodbyeEmbed`,
`ticketPanelEmbed`, plus `ticketPanelButton` (`{ label?, emoji? }`). When an embed is set the bot
uses it; otherwise it falls back to the legacy text message / built-in default.

Both `apps/bot` and `apps/api` import from `@jurassic-haven/db` (workspace dependency).

### apps/bot — Discord bot

Entry point: `src/index.ts` → `createBot()` in `src/bot.ts`

- **Commands** are registered guild-scoped (requires `GUILD_ID` env). Set `RESET_COMMANDS=true` in `.env` and restart to clear and re-register.
- **Command naming convention**: user commands (`/level`, `/leaderboard`, `/profile`), admin config commands (`/cfg_*`), moderation commands (`/mod_*`), ticket commands (`/ticket_*`), test commands (`/test_*`).
- **Command dispatch**: `src/commands/handlers/handler.ts` routes interactions via a `Record<string, Handler>` map to `user.ts`, `admin.ts`, `mod.ts`, or `test.ts`. Admin/mod commands are guarded by `guard.ts` (`requireAdminRole`): a member passes with the native Discord **Administrator** permission, or with the per-guild `adminRoleId` (set from the dashboard), or the legacy global `CFG_ADMIN_ROLE_ID` env — replies ephemerally on failure. Before dispatch, commands listed in the per-guild `disabledCommands` array (toggled on the dashboard `commands` page, read through the same 15s config cache) are rejected ephemerally — commands register globally, so disabling is enforced at runtime, not by unregistering.
- **Gateway intents**: `Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`, `GuildMessageReactions`. Partials: `Message`, `Reaction`, `User` — always fetch partials before processing in reaction event handlers.
- **Events**: `guildCreate`/`guildDelete` (onboarding — intro message on join, config retained on leave), `memberAdd`, `memberRemove`, `messageCreate` (XP), `messageReactionAdd`/`Remove` (reaction roles), `threadUpdate`/`threadDelete` (ticket state sync).
- **Levels subsystem**: `src/levels/autorole.ts` assigns progression roles; `src/levels/levelUpNotify.ts` posts/DMs level-up messages. `leveling` config (set on the dashboard `levels` page) adds an XP multiplier, no-XP channels/roles (skip XP), and level-up notification toggles (`levelUpEnabled` channel post, `levelUpDm` DM) — applied in `messageCreate`. The level-up message itself is a customizable embed (`levelUpEmbed`, edited on the `levels` page) with variables `{user} {username} {server} {level} {role} {avatar}`; falls back to a built-in embed when unset.
- **Moderation**: `/mod_*` handlers in `src/commands/handlers/mod.ts`; every action persists to `modActionRepository` and is posted via `src/modlog.ts` to `modLogChannelId`.
- **Auto-moderation**: `src/automod/automod.ts` runs on `messageCreate` (config read through a 15s in-memory cache, `src/utils/configCache.ts`). Filters: invites, links, banned words, anti-spam. Exempts staff (Administrator/Manage Server/Manage Messages) + configured roles/channels. Action `delete`/`warn`/`mute` reuses `sendModLog` with the bot as moderator. Off unless `autoMod.enabled`.
- **Server logging**: `src/serverlog/serverlog.ts` posts events (message delete/edit, member join/leave, role/nickname changes) to `serverLog.channelId` when `serverLog.enabled` and the per-category toggle is on. Registered as separate listeners in `bot.ts` (decoupled from welcome/XP). Uses the same 15s config cache. Honors `exemptRoleIds`/`exemptChannelIds`; for deletions it also looks up the audit log (best-effort, needs View Audit Log) to show who deleted the message.
- **Tickets**: `src/tickets/handler.ts` — `/ticket_setup` posts the panel embed+button (read from `ticketPanelEmbed`/`ticketPanelButton`); the button opens a modal → private thread (`pending`) → support-role ping → "claim" button. `src/tickets/log.ts` logs open/close to `ticketLogChannelId`.
- **Verification flow**: `joinRoleId` (unverified) is given to every new member; `verifiedRoleId` (verified) is the complement. When a member gains `verifiedRoleId` via reaction roles, the bot removes `joinRoleId`. `cfg_syncverify` assigns `joinRoleId` to members who have neither role.
- **Welcome/goodbye templates & embeds**: variables `{user}` → mention, `{username}` → plain name, `{server}` → guild name, `{member_count}` → current count, `{avatar}` → avatar URL. Substitution lives in `src/utils/embedVars.ts`. If a `welcomeEmbed`/`goodbyeEmbed` is configured the bot sends that embed (via `toDiscordEmbed`); otherwise the legacy text message.
- Adding a new slash command requires: define in `src/commands/register.ts` → add handler in appropriate handler file → register/dispatch in `handler.ts`.

### apps/api — REST API

Entry point: `src/index.ts`  
Port: `API_PORT` env (default 3002)

- Framework: Hono with typed context variables (`AppVariables` in `types.ts`)
- Auth: Discord OAuth2 → JWT (jose library), delivered as an **HttpOnly + Secure cookie** (`jh_token`); the panel calls the API with `credentials: include`. JWT payload carries `userId`, `username`, `avatar` only. The Discord OAuth access token is stored **server-side** in MongoDB (`sessionRepository`, TTL-indexed) via `src/lib/sessions.ts` — survives restarts and is shared across scaled instances. Never in the JWT.
- `authMiddleware.ts` verifies JWT (from `Authorization: Bearer` or cookie), looks up the session store to retrieve the access token, and populates Hono context variables for downstream routes.
- CORS origins come from `CORS_ORIGINS` (comma-separated, falls back to `PANEL_URL`, then localhost); credentials are enabled so a specific origin is echoed, never `*`. Rate limiting (`src/middleware/rateLimit.ts`) is applied globally per IP, with a stricter limit on `/auth/*`.
- Routes:
  - `/auth/discord` — starts OAuth2 flow; `/auth/callback` — exchanges code, sets `jh_token` cookie, redirects to `PANEL_URL/auth/success`; `/auth/me` — returns user from JWT
  - `GET /guilds` — user's admin guilds via Discord API (OAuth token); cached per-token for 5 min with concurrent-request deduplication (`src/lib/guildGuard.ts`)
  - `GET/PUT /guilds/:guildId/config` — guild config read/write; PUT uses an explicit allowlist (`CONFIG_ALLOWED_FIELDS` in `src/routes/guilds.ts`, includes the embed fields) — unknown fields are silently dropped
  - `GET /guilds/:guildId/stats` — dashboard stats (member/online counts via `with_counts`, ban count, warning count, ticket counts); each source is best-effort
  - `GET/POST /guilds/:guildId/channels` — list / create a text channel via bot token
  - `GET/POST /guilds/:guildId/roles` — list / create a role via bot token
  - `GET /guilds/:guildId/leaderboard` — XP leaderboard enriched with Discord member data
  - `POST /guilds/:guildId/ticket-panel` — sends the ticket panel embed+button (read from config, `{server}`/`{member_count}` substituted) to a channel
  - `GET/POST/DELETE /guilds/:guildId/reaction-roles[/:messageId]` — reaction role CRUD; POST builds the embed (full `EmbedConfig` from the editor, or legacy title/content/color), sends to Discord, seeds reactions, then persists to DB
  - `src/routes/moderation.ts` (guild-admin guarded): `GET/DELETE /guilds/:guildId/warnings/:userId`, `GET /guilds/:guildId/mod-actions`, `GET /guilds/:guildId/tickets` (enriched with usernames/avatars), `POST /guilds/:guildId/tickets/:threadId/close|reopen`
  - `src/routes/feedback.ts` (auth-only, not guild-gated; stricter rate limit on POST): `POST /feedback` (submit — author taken from JWT, category/rating/message validated), `GET /feedback/mine` (own submissions)
- Both user OAuth token (guild list) and bot token (channels, roles, leaderboard, tickets, reaction roles, stats) are used — the API therefore also needs `DISCORD_TOKEN`.

### apps/panel — Web dashboard

Framework: Next.js 16 App Router, all dashboard pages are client components (`"use client"`).

- Auth token stored in `localStorage` as `jh_token`; on 401, clears token and redirects to `/`.
- All API calls go through `src/lib/api.ts` — a typed client wrapping `fetch` with retry on 429 and `TokenExpiredError` on 401.
- Routes: `/` (landing), `/auth/success` (OAuth2 callback, saves JWT), `/dashboard` (guild list), `/dashboard/[guildId]/*` (per-server config pages).
- Dashboard sections: overview (stat cards + quick nav), `welcome` (text **or** full embed), `autorole` (join/verified roles), `levels` (XP role reward tiers), `reaction-roles` (embed editor), `moderation` (warnings + action log), `automod` (auto-moderation filters), `serverlog` (event logging), `tickets` (list + panel embed editor + config), `commands` (per-server command enable/disable toggles), `settings` (admin role + mod-log channel), `feedback` (submit product feedback — category/rating/message — + list of own submissions).
- Each server page renders under `TopBar.tsx` (sticky breadcrumb + user menu) and `Sidebar.tsx`; both read the shared nav map in `src/lib/nav.ts` (icons via `lucide-react`).
- **Embed editor**: `src/components/EmbedEditor.tsx` (full editor) + `EmbedPreview.tsx` (live Discord-style preview), shared across welcome/goodbye, ticket panel and reaction-roles. Helpers in `src/lib/embed.ts` (color hex↔int, variable lists, `previewReplacer`). `EmbedConfig` mirrors the type in `@jurassic-haven/db`.
- **Create helpers**: `CreateChannelButton.tsx` / `CreateRoleButton.tsx` call the `POST channels`/`roles` endpoints inline next to selects.
- **Auto-save**: config pages use `hooks/useAutoSave.ts` — a debounced hook that persists changes automatically (baselines the loaded value so it never re-saves on load). The `SaveButton` remains as an explicit manual save. Reaction-roles is excluded (its "publish" posts to Discord and stays manual).

## Key Environment Variables

| App   | Variable                   | Purpose                                                           |
| ----- | -------------------------- | ----------------------------------------------------------------- |
| bot   | `DISCORD_TOKEN`            | Bot token                                                         |
| bot   | `GUILD_ID`                 | Guild to register commands on                                     |
| bot   | `CFG_ADMIN_ROLE_ID`        | Legacy fallback admin role for `/cfg_*`/`/mod_*` (prefer native Administrator perm or per-guild `adminRoleId`) |
| bot   | `RESET_COMMANDS`           | Set `true` once to reset slash commands                           |
| bot   | `WELCOME_CHANNEL_ID`       | Fallback welcome channel (overridden by DB config)                |
| bot   | `GOODBYE_CHANNEL_ID`       | Fallback goodbye channel (overridden by DB config)                |
| bot   | `LEVEL_UP_CHANNEL_ID`      | Fallback level-up notification channel (overridden by DB config)  |
| api   | `DISCORD_TOKEN`            | Bot token (used to proxy channel/role/leaderboard requests)       |
| api   | `CORS_ORIGINS`             | Comma-separated allowed browser origins (falls back to `PANEL_URL`) |
| api   | `DISCORD_CLIENT_ID/SECRET` | OAuth2 credentials                                                |
| api   | `DISCORD_REDIRECT_URI`     | OAuth2 callback URL                                               |
| api   | `JWT_SECRET`               | HS256 signing key                                                 |
| api   | `PANEL_URL`                | Where to redirect after OAuth2 (default: `http://localhost:3000`) |
| both  | `MONGODB_URI`              | MongoDB connection string                                         |
| panel | `NEXT_PUBLIC_API_URL`      | API base URL (default: `http://localhost:3002`)                   |
