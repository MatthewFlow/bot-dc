# @jurassic-haven/db

Shared database layer for the Jurassic Haven monorepo. Used by both `apps/bot` and `apps/api`.

## Tech Stack

- **Database:** MongoDB
- **ODM:** Mongoose
- **Language:** TypeScript

## Architecture

The package follows a repository pattern:

```
packages/db/
├── client.ts                          # connectDb() — call once at app startup
├── xpHelpers.ts                       # XP/level math constants and functions
├── index.ts                           # Single public export surface
├── repositories/                      # TypeScript interfaces (contracts)
│   ├── guildConfigRepository.ts
│   ├── reactionRoleRepository.ts
│   └── xpRepository.ts
└── providers/
    └── mongoose/                      # Mongoose implementations
        ├── providers.ts               # Singleton instances
        ├── guildConfigProvider.ts
        ├── reactionRoleProvider.ts
        ├── xpProvider.ts
        └── schemas/                   # Mongoose schema definitions
            ├── guildConfig.schema.ts
            ├── reactionRole.schema.ts
            └── xp.schema.ts
```

`repositories/` defines interfaces only — no database logic. `providers/mongoose/` contains the Mongoose implementations. This separation allows swapping the database layer without touching consuming code.

## Usage

```ts
import { connectDb, guildConfigRepository, xpRepository } from "@jurassic-haven/db";

// Connect once at startup
await connectDb();

// Use repositories
const config = await guildConfigRepository.get(guildId);
await xpRepository.addXpWithCooldown({ guildId, userId, amount: 15 });
```

## Repositories

### `guildConfigRepository`

Stores per-guild bot configuration.

| Method | Description |
| ------ | ----------- |
| `get(guildId)` | Returns config or `null` if not set |
| `set(guildId, patch)` | Upserts a partial config update |

**Schema fields:** `welcomeChannelId`, `goodbyeChannelId`, `levelUpChannelId`, `joinRoleId`, `welcomeMessage`, `goodbyeMessage`, `roleRewards[]` (`{ level, roleId }`)

### `xpRepository`

Stores per-user XP across guilds.

| Method | Description |
| ------ | ----------- |
| `get(guildId, userId)` | Returns XP entry or `null` |
| `addXpWithCooldown(opts)` | Adds XP respecting the 5s cooldown, returns result with level info |
| `addXp(guildId, userId, amount)` | Adds XP without cooldown check |
| `getLeaderboard(guildId, limit)` | Returns top N users sorted by XP |

### `reactionRoleRepository`

Stores reaction role message configurations.

| Method | Description |
| ------ | ----------- |
| `getByGuildId(guildId)` | Lists all reaction role messages for a guild |
| `getByMessageId(messageId)` | Returns config for a specific Discord message |
| `create(data)` | Creates a new reaction role configuration |
| `delete(messageId)` | Removes a reaction role configuration |

## XP Helpers

Constants and pure functions exported from `xpHelpers.ts`:

| Export | Value / Description |
| ------ | ------------------- |
| `XP_PER_MESSAGE` | `15` — XP granted per message |
| `XP_COOLDOWN_MS` | `5000` — Cooldown between XP grants (ms) |
| `XP_PER_LEVEL` | `100` — XP required per level |
| `XP_SAVE_DEBOUNCE_MS` | `2000` — Debounce before flushing XP to DB (ms) |
| `XP_SYNCALL_DELAY_MS` | `350` — Delay between members during bulk role sync (ms) |
| `levelFromXp(xp)` | `floor(xp / 100) + 1` |
| `xpToNextLevel(xp)` | XP remaining until next level |

## Environment

Requires `MONGODB_URI` to be set before calling `connectDb()`.
