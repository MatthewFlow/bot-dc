# Jurassic Haven — Discord Bot

A Discord bot for the Jurassic Haven server. Features an XP leveling system, automatic role rewards, welcome and farewell messages.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) v1.2+
- **Language:** TypeScript
- **Discord:** discord.js v14
- **Database:** MongoDB + Mongoose (via @jurassic-haven/db)
- **Linting:** ESLint + Prettier

## Requirements

- Bun v1.2 or newer
- MongoDB instance (local or remote)
- A Discord account and bot application ([Discord Developer Portal](https://discord.com/developers/applications))

## Installation

```bash
# From monorepo root
bun install
```

## Configuration

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# ── API ────────────────────────────────────────────────────────────
API_PORT=3001
API_TOKEN=

# ── DATABASE ───────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/jurassic-haven

# ── DISCORD ────────────────────────────────────────────────────────
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

# ── SERVER ─────────────────────────────────────────────────────────
GUILD_ID=
CFG_ADMIN_ROLE_ID=

# ── CHANNELS ───────────────────────────────────────────────────────
WELCOME_CHANNEL_ID=
GOODBYE_CHANNEL_ID=
LEVEL_UP_CHANNEL_ID=

# ── DEBUG ──────────────────────────────────────────────────────────
RESET_COMMANDS=false
```

### Getting a bot token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application → open the **Bot** tab
3. Click **Reset Token**, copy it into `DISCORD_TOKEN`
4. Enable **Privileged Gateway Intents**: `Server Members Intent` and `Message Content Intent`

### Inviting the bot to your server

In the Developer Portal go to **OAuth2 → URL Generator**, select the following scopes:

- `bot`
- `applications.commands`

And the following bot permissions:

- `Manage Roles`
- `Send Messages`
- `View Channels`
- `Read Message History`
- `Manage Messages`

## Running

```bash
cd apps/bot
bun run start
```

### Resetting slash commands

Set `RESET_COMMANDS=true` in `.env` and restart the bot. Set it back to `false` after startup.

## Commands

### User

| Command  | Description                                                    |
| -------- | -------------------------------------------------------------- |
| `/level` | Shows your current level, XP, and XP needed for the next level |

### Configuration (requires admin role)

| Command                         | Description                                                |
| ------------------------------- | ---------------------------------------------------------- |
| `/cfg_setwelcome #channel`      | Sets the welcome message channel                           |
| `/cfg_setgoodbye #channel`      | Sets the farewell message channel                          |
| `/cfg_addreward <level> <role>` | Adds a threshold: role granted from the given level onward |
| `/cfg_rolelist`                 | Lists all configured role thresholds                       |
| `/cfg_checkrole [user]`         | Shows progression role status for a user                   |
| `/cfg_syncrole [user]`          | Forces a role sync for a single user                       |
| `/cfg_syncall [limit]`          | Syncs roles for multiple users (default max: 50)           |
| `/cfg_addxp <amount> [user]`    | Adds XP to a user without cooldown                         |
| `/cfg_clear <amount>`           | Deletes the last N messages from the current channel       |

### Testing (requires admin role)

| Command         | Description                                             |
| --------------- | ------------------------------------------------------- |
| `/test_welcome` | Sends a test welcome message to the configured channel  |
| `/test_goodbye` | Sends a test farewell message to the configured channel |

## XP and Leveling System

- Every message grants **15 XP** (5-second cooldown per user)
- Level formula: `level = floor(xp / 100) + 1`
- On level-up, the bot sends a notification to the configured channel
- Role thresholds are configured with `/cfg_addreward`

## Project Structure

```
src/
├── commands/
│   ├── handlers/
│   │   ├── handler.ts     # dispatcher
│   │   ├── guard.ts       # admin role check
│   │   ├── user.ts        # /level
│   │   ├── admin.ts       # /cfg_*
│   │   └── test.ts        # /test_*
│   └── register.ts        # command registration
├── config/
│   └── env.ts             # environment variables
├── events/
│   ├── memberAdd.ts       # handles member join
│   ├── memberRemove.ts    # handles member leave
│   └── messageCreate.ts   # XP on message
├── levels/
│   ├── autorole.ts        # progression role assignment
│   └── levelUpNotify.ts   # level-up notifications
├── utils/
│   └── channels.ts        # channel type helper
├── bot.ts                 # Discord client setup
└── index.ts               # entry point
```
