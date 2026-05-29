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

## Development

Install all dependencies from root:

```bash
bun install
```

Run each app in a separate terminal:

```bash
# Terminal 1
cd apps/bot && bun run start

# Terminal 2
cd apps/api && bun run start

# Terminal 3
cd apps/panel && bun run dev
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
