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

### Lint & Format

```bash
bun run lint           # ESLint across entire repo
bun run lint:fix       # Auto-fix ESLint errors
bun run format         # Prettier write
bun run format:check   # Prettier check
```

> ESLint ignores `apps/panel/**` — lint the panel separately via `cd apps/panel && bun run lint`.

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
- `providers/mongoose/providers.ts` — singleton instances exported as `xpRepository`, `guildConfigRepository`, `reactionRoleRepository`
- `index.ts` — single public export surface for the whole package
- `xpHelpers.ts` — XP/level math constants: 15 XP/message, 5s cooldown, 100 XP/level, `levelFromXp(xp)`, `xpToNextLevel(xp)`
- `client.ts` — `connectDb()` — call once at app startup before any DB use

Both `apps/bot` and `apps/api` import from `@jurassic-haven/db` (workspace dependency).

### apps/bot — Discord bot

Entry point: `src/index.ts` → `createBot()` in `src/bot.ts`

- **Commands** are registered guild-scoped (requires `GUILD_ID` env). Set `RESET_COMMANDS=true` in `.env` and restart to clear and re-register.
- **Command naming convention**: user commands (`/level`, `/leaderboard`), admin config commands (`/cfg_*`), test commands (`/test_*`).
- **Command dispatch**: `src/commands/handlers/handler.ts` routes interactions to `user.ts`, `admin.ts`, or `test.ts`. Admin commands are guarded by `guard.ts` which checks `CFG_ADMIN_ROLE_ID`.
- **Events**: `memberAdd`, `memberRemove`, `messageCreate` (XP), `messageReactionAdd`/`Remove` (reaction roles).
- **Levels subsystem**: `src/levels/autorole.ts` assigns progression roles; `src/levels/levelUpNotify.ts` posts level-up messages.
- Adding a new slash command requires: define in `src/commands/register.ts` → add handler in appropriate handler file → register/dispatch in `handler.ts`.

### apps/api — REST API

Entry point: `src/index.ts`  
Port: `API_PORT` env (default 3002)

- Framework: Hono with typed context variables (`AppVariables` in `types.ts`)
- Auth: Discord OAuth2 → JWT (jose library). JWT payload carries `userId`, `username`, `avatar`, `accessToken`.
- `authMiddleware.ts` verifies JWT and populates Hono context variables for downstream routes.
- Routes: `/auth` (OAuth2 flow + `/me`), `/guilds` (config CRUD, channels, roles), `/guilds` (reaction roles).
- The API proxies Discord REST for guild channel/role listings using the user's OAuth2 access token from the JWT.

### apps/panel — Web dashboard

Framework: Next.js 16 App Router, all dashboard pages are client components (`"use client"`).

- Auth token stored in `localStorage` as `jh_token`; on 401, clears token and redirects to `/`.
- All API calls go through `src/lib/api.ts` — a typed client wrapping `fetch` with retry on 429 and `TokenExpiredError` on 401.
- Routes: `/` (landing), `/auth/success` (OAuth2 callback, saves JWT), `/dashboard` (guild list), `/dashboard/[guildId]/*` (per-server config pages).
- Dashboard sections: `welcome` (welcome/goodbye channels + messages), `autorole` (join role), `levels` (XP role reward tiers), `reaction-roles` (reaction role assignments).
- Sidebar navigation is in `src/components/Sidebar.tsx`.

## Key Environment Variables

| App   | Variable              | Purpose                               |
|-------|-----------------------|---------------------------------------|
| bot   | `DISCORD_TOKEN`       | Bot token                             |
| bot   | `GUILD_ID`            | Guild to register commands on         |
| bot   | `CFG_ADMIN_ROLE_ID`   | Role ID required for `/cfg_*` commands|
| bot   | `RESET_COMMANDS`      | Set `true` once to reset slash commands|
| api   | `DISCORD_CLIENT_ID/SECRET` | OAuth2 credentials                |
| api   | `DISCORD_REDIRECT_URI`| OAuth2 callback URL                   |
| api   | `JWT_SECRET`          | HS256 signing key                     |
| both  | `MONGODB_URI`         | MongoDB connection string             |
| panel | `NEXT_PUBLIC_API_URL` | API base URL (default: `http://localhost:3002`) |
