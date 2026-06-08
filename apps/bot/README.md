# Jurassic Haven — Discord Bot

A Discord bot for the Jurassic Haven server. Features an XP leveling system, automatic role
rewards, reaction roles, customizable welcome/farewell embeds, a moderation toolkit, and a
support-ticket system.

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
# ── DATABASE ───────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/jurassic-haven

# ── DISCORD ────────────────────────────────────────────────────────
DISCORD_TOKEN=

# ── SERVER ─────────────────────────────────────────────────────────
GUILD_ID=
# Legacy fallback admin role. Prefer the native Administrator permission or a
# per-guild admin role configured from the dashboard.
CFG_ADMIN_ROLE_ID=

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

- `Manage Roles` — auto-role, role rewards, creating roles from the dashboard
- `Manage Channels` — creating channels from the dashboard
- `Manage Threads` / `Create Private Threads` — ticket system
- `Kick Members`, `Ban Members`, `Moderate Members` (timeout) — moderation commands
- `Send Messages`
- `View Channels`
- `Read Message History`
- `Manage Messages`
- `Add Reactions`

## Running

```bash
cd apps/bot
bun run start
```

### Resetting slash commands

Set `RESET_COMMANDS=true` in `.env` and restart the bot. Set it back to `false` after startup.

## Commands

### User

| Command        | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `/level`       | Shows your current level, XP, and XP needed for the next level |
| `/leaderboard` | Shows top 10 players by XP on the server                       |
| `/profile`     | Shows a user's profile card (level, XP, rank)                  |

> **Authorization (multi-tenant):** privileged commands pass when the member has the native
> Discord **Administrator** permission, or a per-guild admin role (`adminRoleId`, set from the
> dashboard), or the legacy global `CFG_ADMIN_ROLE_ID`. So no per-server env is required.

### Configuration (requires admin role)

| Command                         | Description                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| `/cfg_setwelcome #channel`      | Sets the welcome message channel                                    |
| `/cfg_setgoodbye #channel`      | Sets the farewell message channel                                   |
| `/cfg_setmodlog #channel`       | Sets the moderation log channel                                     |
| `/cfg_setticketrole <role>`     | Sets a ticket support role                                          |
| `/cfg_addreward <level> <role>` | Adds a threshold: role granted from the given level onward          |
| `/cfg_rolelist`                 | Lists all configured role thresholds                                |
| `/cfg_checkrole [user]`         | Shows progression role status for a user                            |
| `/cfg_syncxp [user] [limit]`    | Sync XP roles — single user if `user` given, otherwise all (max 50) |
| `/cfg_syncverify`               | Assign unverified role to all members who have no verification role |
| `/cfg_clear <amount>`           | Deletes the last N messages from the current channel                |

### Moderation (requires admin role)

| Command                       | Description                     |
| ----------------------------- | ------------------------------- |
| `/mod_warn <user> <reason>`   | Warns a user (stored + logged)  |
| `/mod_warnings <user>`        | Lists a user's warnings         |
| `/mod_clearwarns <user>`      | Clears a user's warnings        |
| `/mod_mute <user> <duration>` | Times out a user for a duration |
| `/mod_unmute <user>`          | Removes a timeout               |
| `/mod_kick <user> [reason]`   | Kicks a user                    |
| `/mod_ban <user> [reason]`    | Bans a user                     |

Every moderation action is written to `modActionRepository` and posted to the mod-log channel.

### Tickets (requires admin / support role)

| Command              | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `/ticket_setup`      | Posts the ticket panel embed + button on the current channel |
| `/ticket_close`      | Closes the current ticket thread (lock + archive)            |
| `/ticket_add <user>` | Adds a user to the current ticket thread                     |

Users open tickets by clicking the panel button and filling in a short modal; the bot creates a
private thread, pings the support roles, and posts a "claim" button. Ticket events are logged to
the ticket-log channel.

### Testing (requires admin role)

| Command                      | Description                                             |
| ---------------------------- | ------------------------------------------------------- |
| `/test_welcome`              | Sends a test welcome message to the configured channel  |
| `/test_goodbye`              | Sends a test farewell message to the configured channel |
| `/cfg_addxp <amount> [user]` | Adds XP to a user without cooldown (bypasses 5s limit)  |

## XP and Leveling System

- Every message grants **15 XP** (5-second cooldown per user), scaled by the per-server XP multiplier
- Level formula: `level = floor(xp / 100) + 1`
- On level-up, the bot posts to the configured channel and/or DMs the user (dashboard toggles)
- No-XP channels and roles can be excluded from earning XP (dashboard `levels` page)
- Role thresholds are configured with `/cfg_addreward` or the dashboard

## Welcome & Goodbye Messages

- Configurable via the web dashboard in two modes: **plain text** or a **full embed**
- Supported variables: `{user}`, `{username}`, `{server}`, `{member_count}`, `{avatar}`
- When a `welcomeEmbed` / `goodbyeEmbed` is configured the bot sends it (variables substituted);
  otherwise it falls back to the legacy text message, then to a built-in default

## Embeds

- Configurable embeds (welcome, goodbye, ticket panel) are stored as `EmbedConfig` in the guild
  config and rendered through the shared `toDiscordEmbed()` converter in `@jurassic-haven/db`
- The ticket panel embed and its button (label + emoji) are edited from the dashboard; the
  `{server}` and `{member_count}` variables are substituted when the panel is posted
- Reaction-role messages are published from the dashboard embed editor (full embed support)

## Auto-role & Verification

- **Unverified role** (`joinRoleId`) — automatically assigned to every new member on join
- **Verified role** (`verifiedRoleId`) — when a user receives this role via Reaction Roles, the bot automatically removes the unverified role
- Both roles are configured via the web dashboard (Auto-role page)
- Use `/cfg_syncverify` to retroactively assign the unverified role to existing members who have neither role

## Reaction Roles

- Bot publishes an embed with emoji reactions to a configured channel
- Users react with emoji to receive the associated role
- Removing a reaction removes the role
- Multiple emoji → role pairs supported per message
- Configured via the web dashboard

## Auto-moderation

- Configured per-server from the dashboard (`/automod`); off unless enabled
- Filters: Discord invites, links, banned words, and anti-spam (N messages / T seconds)
- Action on a hit: delete the message, optionally **warn** (recorded) or **timeout** the user
- Exempts staff (Administrator / Manage Server / Manage Messages) plus configured roles/channels
- Violations are written to the moderation log with the bot as the actor
- Runs on every message via a 15s-cached guild config to keep DB load low

## Server logging

- Configured per-server from the dashboard (`/serverlog`); off unless enabled
- Posts events to a chosen channel, each category individually toggleable:
  deleted messages, edited messages, member joins/leaves, role changes, nickname changes
- Uses existing intents (no extra setup); deleted/edited content requires the message to be
  in the bot's cache
- Reads config through the same 15s cache as auto-moderation

## Project Structure

```
src/
├── commands/
│   ├── handlers/
│   │   ├── handler.ts              # dispatcher
│   │   ├── guard.ts                # admin role check
│   │   ├── user.ts                 # /level, /leaderboard, /profile
│   │   ├── admin.ts                # /cfg_*
│   │   ├── mod.ts                  # /mod_* moderation commands
│   │   └── test.ts                 # /test_*
│   └── register.ts                 # command registration
├── config/
│   └── env.ts                      # environment variables
├── events/
│   ├── guildCreate.ts              # bot added — intro message + log
│   ├── guildDelete.ts              # bot removed — log (config retained)
│   ├── memberAdd.ts                # member join + auto-role + welcome embed
│   ├── memberRemove.ts             # member leave + goodbye embed
│   ├── messageCreate.ts            # XP on message
│   ├── messageReactionAdd.ts       # reaction role assignment
│   ├── messageReactionRemove.ts    # reaction role removal
│   ├── threadUpdate.ts             # ticket thread state sync
│   └── threadDelete.ts             # ticket thread cleanup
├── automod/
│   └── automod.ts                  # auto-moderation filters + actions
├── serverlog/
│   └── serverlog.ts                # server event logging
├── levels/
│   ├── autorole.ts                 # progression role assignment
│   └── levelUpNotify.ts            # level-up notifications
├── tickets/
│   ├── handler.ts                  # ticket panel, modal, claim, close, add
│   └── log.ts                      # ticket event logging
├── modlog.ts                       # moderation action logging
├── utils/
│   ├── channels.ts                 # channel type helper
│   ├── configCache.ts              # short-TTL guild-config cache (hot path)
│   └── embedVars.ts                # member variable substitution ({user}, {avatar}, …)
├── bot.ts                          # Discord client setup
└── index.ts                        # entry point
```
