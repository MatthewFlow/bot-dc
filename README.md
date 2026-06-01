# Jurassic Haven

A modular Discord bot platform with a web dashboard for server configuration.

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
