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
├── embed.ts                           # Shared embed model + EmbedConfig → Discord JSON converter
├── index.ts                           # Single public export surface
├── repositories/                      # TypeScript interfaces (contracts)
│   ├── guildConfigRepository.ts
│   ├── reactionRoleRepository.ts
│   ├── xpRepository.ts
│   ├── warnRepository.ts
│   ├── modActionRepository.ts
│   ├── ticketRepository.ts
│   ├── feedbackRepository.ts
│   ├── botStatusRepository.ts
│   └── sessionRepository.ts
└── providers/
    └── mongoose/                      # Mongoose implementations
        ├── providers.ts               # Singleton instances
        ├── guildConfigProvider.ts
        ├── reactionRoleProvider.ts
        ├── xpProvider.ts
        ├── warnProvider.ts
        ├── modActionProvider.ts
        ├── ticketProvider.ts
        ├── feedbackProvider.ts
        ├── botStatusProvider.ts
        ├── sessionProvider.ts
        └── schemas/                   # Mongoose schema definitions
            ├── guildConfig.schema.ts
            ├── reactionRole.schema.ts
            ├── xp.schema.ts
            ├── warn.schema.ts
            ├── modAction.schema.ts
            ├── ticket.schema.ts
            ├── feedback.schema.ts
            ├── botStatus.schema.ts
            └── session.schema.ts
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

Singleton repositories exported from `index.ts`: `guildConfigRepository`, `xpRepository`,
`reactionRoleRepository`, `warnRepository`, `ticketRepository`, `modActionRepository`,
`sessionRepository`, `feedbackRepository`, `botStatusRepository`.

## Repositories

### `guildConfigRepository`

Stores per-guild bot configuration.

| Method                | Description                         |
| --------------------- | ----------------------------------- |
| `get(guildId)`        | Returns config or `null` if not set |
| `set(guildId, patch)` | Upserts a partial config update     |

**Schema fields:** `welcomeChannelId`, `goodbyeChannelId`, `levelUpChannelId`, `joinRoleId`,
`verifiedRoleId`, `welcomeMessage`, `goodbyeMessage`, `roleRewards[]` (`{ level, roleId }`),
`modLogChannelId`, `adminRoleId`, `ticketSupportRoleId`, `ticketSupportRoleId2`,
`ticketLogChannelId`, `feedbackChannelId`, `disabledCommands[]`, `welcomeEmbed`, `goodbyeEmbed`,
`ticketPanelEmbed`, `levelUpEmbed`, `feedbackPanelEmbed` (all `EmbedConfig`), `ticketPanelButton`
(`{ label?, emoji? }`), `autoMod` (`AutoModConfig` — filters, action, exemptions), `serverLog`
(`ServerLogConfig` — channel + per-category event toggles), `leveling` (`LevelingConfig` — XP
multiplier, no-XP channels/roles, level-up toggles). The `serverLog` config also carries
`exemptRoleIds`/`exemptChannelIds`.

### `xpRepository`

Stores per-user XP across guilds.

| Method                           | Description                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `get(guildId, userId)`           | Returns XP entry or `null`                                         |
| `addXpWithCooldown(opts)`        | Adds XP respecting the 5s cooldown, returns result with level info |
| `addXp(guildId, userId, amount)` | Adds XP without cooldown check                                     |
| `getLeaderboard(guildId, limit)` | Returns top N users sorted by XP                                   |

### `reactionRoleRepository`

Stores reaction role message configurations.

| Method                      | Description                                   |
| --------------------------- | --------------------------------------------- |
| `getByGuildId(guildId)`     | Lists all reaction role messages for a guild  |
| `getByMessageId(messageId)` | Returns config for a specific Discord message |
| `create(data)`              | Creates a new reaction role configuration     |
| `delete(messageId)`         | Removes a reaction role configuration         |

Each record stores `title`, `content`, `color` (summary for list display) plus an optional
full `embed` (`EmbedConfig`) when published from the dashboard embed editor.

### `warnRepository`

Stores per-user moderation warnings.

| Method                    | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `add(opts)`               | Adds a warning                                         |
| `getAll(guildId, userId)` | Returns all warnings for a user                        |
| `clear(guildId, userId)`  | Deletes all warnings for a user, returns deleted count |
| `countByGuild(guildId)`   | Total number of warnings across the guild (dashboard)  |

### `ticketRepository`

Stores support ticket threads.

| Method                             | Description                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `create(opts)`                     | Creates a `pending` ticket                            |
| `getByThread(threadId)`            | Returns ticket for a thread                           |
| `getActiveByUser(guildId, userId)` | Returns the user's open/pending ticket, if any        |
| `getAll(guildId, status?)`         | Lists tickets (optionally filtered by status)         |
| `counts(guildId)`                  | `{ total, pending, open, closed }` counts (dashboard) |
| `claim(threadId, moderatorId)`     | Marks ticket `open` and assigns a moderator           |
| `close(threadId)`                  | Marks ticket `closed`                                 |
| `reopen(threadId)`                 | Reopens a closed ticket                               |
| `delete(threadId)`                 | Removes the ticket record                             |

### `modActionRepository`

Stores a log of moderation actions (`warn`, `mute`, `unmute`, `kick`, `ban`, `clearwarns`).

| Method                       | Description                       |
| ---------------------------- | --------------------------------- |
| `add(opts)`                  | Records a moderation action       |
| `getRecent(guildId, limit)`  | Most recent actions for a guild   |
| `getByUser(guildId, userId)` | Actions targeting a specific user |

### `feedbackRepository`

Stores user feedback submissions (from `/feedback`, the feedback panel and the dashboard form)
plus per-admin read state (`FeedbackRead`) for the notification bell.

| Method                              | Description                                                |
| ----------------------------------- | ---------------------------------------------------------- |
| `add(opts)`                         | Stores a submission (`userId`, `username`, `guildId`, …)   |
| `getByUser(userId)`                 | A user's own submissions                                   |
| `getByGuild(guildId, limit?)`       | All submissions for a guild (newest first)                 |
| `countByGuildSince(guildId, since)` | Count since a timestamp (unread badge)                     |
| `getSeenAt(userId, guildId)`        | When this admin last read the guild's feedback             |
| `markSeen(userId, guildId, at)`     | Marks the guild's feedback read for this admin             |
| `delete(id, guildId)`               | Deletes a submission (verifies guild when the row has one) |

### `botStatusRepository`

Single heartbeat document the bot refreshes periodically; the API reads it to report
online/offline in the dashboard.

| Method            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `heartbeat(opts)` | Upserts `lastHeartbeat` + username/avatar/guild count |
| `get()`           | Raw snapshot (freshness is evaluated in the API)      |

### `sessionRepository`

Server-side store of Discord OAuth access tokens (used by the API). Backed by a TTL-indexed
collection so sessions expire automatically, survive restarts, and are shared across instances.

| Method                          | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `set(userId, accessToken, ttl)` | Upserts a session with a TTL (ms)              |
| `get(userId)`                   | Returns the access token, or `null` if expired |
| `delete(userId)`                | Removes a session (e.g. on logout)             |

## Embed Helpers (`embed.ts`)

Shared, generic Discord embed model used by the panel editor, the API (REST send) and the bot
(discord.js accepts the same JSON in `embeds: []`).

| Export                      | Description                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmbedConfig`               | Editable embed shape (title, description, color, author, images, footer, fields, …)                                                                             |
| `toDiscordEmbed(cfg, sub?)` | Converts an `EmbedConfig` to a Discord embed JSON. `sub` substitutes template variables (`{user}`, `{server}`, …); empty fields are dropped and lengths clamped |
| `isEmbedEmpty(embed)`       | True when an embed has no visible content (Discord rejects empty embeds)                                                                                        |

## XP Helpers

Constants and pure functions exported from `xpHelpers.ts`:

| Export                | Value / Description                                      |
| --------------------- | -------------------------------------------------------- |
| `XP_PER_MESSAGE`      | `15` — XP granted per message                            |
| `XP_COOLDOWN_MS`      | `5000` — Cooldown between XP grants (ms)                 |
| `XP_PER_LEVEL`        | `100` — XP required per level                            |
| `XP_SAVE_DEBOUNCE_MS` | `2000` — Debounce before flushing XP to DB (ms)          |
| `XP_SYNCALL_DELAY_MS` | `350` — Delay between members during bulk role sync (ms) |
| `levelFromXp(xp)`     | `floor(xp / 100) + 1`                                    |
| `xpToNextLevel(xp)`   | XP remaining until next level                            |

## Environment

Requires `MONGODB_URI` to be set before calling `connectDb()`.
