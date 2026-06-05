# Jurassic Haven

A modular Discord bot platform with a web dashboard for server configuration.

## Features

- **XP & levels** — message-based XP, level-up notifications, role reward tiers, leaderboard
- **Auto-role & verification** — unverified/verified role flow driven by reaction roles
- **Welcome / Goodbye** — plain text or fully customizable embeds with variables
- **Reaction roles** — published from a full embed editor with emoji → role pairs
- **Moderation** — warn / mute / kick / ban with a persisted action log and mod-log channel
- **Tickets** — button panel → private threads, claim/close flow, dashboard management
- **Embed editor** — shared editor + live preview for welcome, goodbye, ticket panel and
  reaction-role embeds
- **Dashboard** — per-server overview with live stats (members, bans, warnings, tickets),
  create-channel / create-role helpers, OAuth2 login

## Project Structure

```
BOT-DC/
├── apps/
│   ├── bot/      # Discord bot (Bun + Discord.js)
│   ├── api/      # REST API (Bun + Hono)
│   └── panel/    # Web dashboard (Next.js)
└── packages/
    └── db/       # Shared database layer (MongoDB + Mongoose)
```

## Tech Stack

| App      | Tech                          |
| -------- | ----------------------------- |
| Bot      | Bun, Discord.js, TypeScript   |
| API      | Bun, Hono, TypeScript         |
| Panel    | Next.js, TypeScript, Tailwind |
| Database | MongoDB, Mongoose             |
| Auth     | Discord OAuth2, JWT           |

## Getting Started

See individual README files for setup instructions:

- [Bot](./apps/bot/README.md)
- [API](./apps/api/README.md)
- [Panel](./apps/panel/README.md)
- [DB](./packages/db/README.md)

## Development

Install all dependencies from root:

```bash
bun install
```

Start all apps at once in watch mode (auto-reload on file changes):

```bash
bun run dev
```

Or run each app individually in a separate terminal:

```bash
# Terminal 1 — Discord bot
bun run bot

# Terminal 2 — REST API
bun run api

# Terminal 3 — Web dashboard
bun run panel
```

## Testing & CI

```bash
# Run the unit test suite (bun:test)
bun test

# Typecheck all apps (tsc --noEmit)
bun run typecheck
```

GitHub Actions (`.github/workflows/ci.yml`) runs lint + typecheck + test on pushes to `main`
and on pull requests. Unit tests live next to the code as `*.test.ts`.

## Linting and Formatting

```bash
# Lint entire project
bun run lint

# Fix lint errors
bun run lint:fix

# Format all files
bun run format

# Check formatting
bun run format:check
```
