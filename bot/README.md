# Jurassic Haven — Discord Bot

A Discord bot for the Jurassic Haven server. Features an XP leveling system, automatic role rewards, welcome and farewell messages, and a REST API for managing server configuration.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) v1.2+
- **Language:** TypeScript
- **Discord:** discord.js v14
- **API:** Hono
- **Linting:** ESLint + Prettier

## Requirements

- Bun v1.2 or newer
- A Discord account and bot application ([Discord Developer Portal](https://discord.com/developers/applications))

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd <folder-name>

# Install dependencies
bun install
```

## Configuration

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required
DISCORD_TOKEN=        # bot token from the Discord Developer Portal
GUILD_ID=             # server ID (right-click the server → Copy ID)

# API
API_TOKEN=            # secret for REST API authorization; if empty — API is open
API_PORT=3001         # HTTP port (default: 3001)

# Admin role
CFG_ADMIN_ROLE_ID=    # ID of the role required to use /cfg_* and /test_* commands

# Channels (fallback — can also be set via /cfg_* commands)
WELCOME_CHANNEL_ID=
GOODBYE_CHANNEL_ID=
LEVEL_UP_CHANNEL_ID=

# Debug
RESET_COMMANDS=false  # set to true to clear and re-register slash commands
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

Open the generated URL in your browser and select your server.

## Running

```bash
bun run index.ts
```

Slash commands are registered automatically on first launch.

### Resetting slash commands

If commands are duplicated or you want to re-register them from scratch:

```bash
RESET_COMMANDS=true bun run index.ts
```

Turn the flag off (or remove it from `.env`) after the bot starts.

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
| `/cfg_listrewards`              | Lists all configured role thresholds                       |
| `/cfg_checkrole [user]`         | Debugs progression role status for a user                  |
| `/cfg_syncrole [user]`          | Forces a role sync for a single user                       |
| `/cfg_syncall [limit]`          | Syncs roles for multiple users (default max: 50)           |

### Testing (requires admin role)

| Command                       | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `/test_welcome`               | Sends a test welcome message to the configured channel  |
| `/test_goodbye`               | Sends a test farewell message to the configured channel |
| `/test_addxp <amount> [user]` | Adds XP without cooldown (for testing level thresholds) |

## XP and Leveling System

- Every message grants **15 XP** (5-second cooldown per user)
- Level formula: `level = floor(xp / 100) + 1`
- On level-up, the bot sends a notification to the channel set via `LEVEL_UP_CHANNEL_ID` or `/cfg_*`
- Role thresholds are configured with `/cfg_addreward` — the bot assigns the highest role the user qualifies for and removes any lower progression roles

## REST API

The API starts automatically alongside the bot.

If `API_TOKEN` is set, all endpoints require the following header:

```
Authorization: Bearer <API_TOKEN>
```

### Endpoints

| Method | Path                            | Description                               |
| ------ | ------------------------------- | ----------------------------------------- |
| `GET`  | `/api/health`                   | Health check                              |
| `GET`  | `/api/guilds/:guildId/config`   | Get server configuration                  |
| `PUT`  | `/api/guilds/:guildId/config`   | Update server configuration               |
| `GET`  | `/api/guilds/:guildId/channels` | List text channels (fetched from Discord) |
| `GET`  | `/api/guilds/:guildId/roles`    | List server roles (fetched from Discord)  |

### Example — updating configuration

```bash
curl -X PUT http://localhost:3001/api/guilds/123456789/config \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "welcomeChannelId": "111222333",
    "levelUpChannelId": "444555666",
    "roleRewards": [
      { "level": 5, "roleId": "777888999" },
      { "level": 10, "roleId": "000111222" }
    ]
  }'
```

## Project Structure

```
src/
├── config/
│   ├── env.ts           # environment variables
│   ├── store.ts         # per-guild configuration (persisted to JSON)
│   └── xp.ts            # XP system constants
├── api/
│   └── server.ts        # Hono REST API
├── commands/
│   ├── handlers.ts      # slash command logic
│   └── register.ts      # command registration with Discord
├── events/
│   ├── memberAdd.ts     # handles member join
│   ├── memberRemove.ts  # handles member leave
│   └── messageCreate.ts # XP on message
├── levels/
│   ├── autorole.ts      # assigning and removing progression roles
│   ├── levelUpNotify.ts # level-up notifications
│   └── store.ts         # XP data (persisted to JSON)
├── utils/
│   └── channels.ts      # channel type validation helper
├── bot.ts               # Discord client setup
└── index.ts             # entry point
```

## Data Persistence

XP and server configuration are stored locally as JSON files:

```
src/data/
├── xp.json      # per-guild user XP
└── config.json  # per-guild channel and role threshold config
```

Both files are created automatically on first run. Make sure to add `src/data/` to your `.gitignore`.

## Linting and Formatting

```bash
# Check for lint errors
bun run lint

# Auto-fix lint errors
bun run lint:fix

# Format all files
bun run format

# Check formatting without making changes
bun run format:check
```
