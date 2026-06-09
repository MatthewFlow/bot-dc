# Jurassic Haven — API

REST API for the Jurassic Haven dashboard. Handles Discord OAuth2 authentication, server
configuration, reaction roles, moderation, tickets, feedback and the bot status indicator.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) v1.2+
- **Language:** TypeScript
- **Framework:** Hono
- **Auth:** Discord OAuth2 + JWT (jose)
- **Database:** MongoDB + Mongoose (via @jurassic-haven/db)

## Requirements

- Bun v1.2 or newer
- MongoDB instance (local or remote)
- Discord application with OAuth2 configured

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
API_PORT=3002
# Comma-separated allowed browser origins (defaults to PANEL_URL, then localhost)
CORS_ORIGINS=http://localhost:3000

# ── DATABASE ───────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/jurassic-haven

# ── DISCORD OAUTH2 ─────────────────────────────────────────────────
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3002/auth/callback
DISCORD_TOKEN=

# ── PANEL ──────────────────────────────────────────────────────────
PANEL_URL=http://localhost:3000

# ── AUTH ───────────────────────────────────────────────────────────
JWT_SECRET=
```

### Getting OAuth2 credentials

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Open your application → **OAuth2**
3. Copy **Client ID** into `DISCORD_CLIENT_ID`
4. Click **Reset Secret** → copy into `DISCORD_CLIENT_SECRET`
5. Add `http://localhost:3002/auth/callback` to **Redirects**
6. Click **Save Changes**

### Generating JWT_SECRET

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[System.Convert]::ToBase64String($bytes)
```

## Running

```bash
cd apps/api
bun run start
```

## Endpoints

### Auth

| Method | Path             | Description                              |
| ------ | ---------------- | ---------------------------------------- |
| `GET`  | `/auth/discord`  | Redirect to Discord OAuth2 login         |
| `GET`  | `/auth/callback` | OAuth2 callback — exchanges code for JWT |
| `GET`  | `/auth/me`       | Returns current user info                |
| `POST` | `/auth/logout`   | Clears the `jh_token` cookie             |

### Guilds (requires JWT)

| Method   | Path                                         | Description                                         |
| -------- | -------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/guilds`                                    | List servers the user can manage or moderate        |
| `GET`    | `/guilds/:guildId/config`                    | Get server configuration                            |
| `PUT`    | `/guilds/:guildId/config`                    | Update server configuration (allowlisted fields)    |
| `GET`    | `/guilds/:guildId/stats`                     | Dashboard stats (members, bans, warnings, tickets)  |
| `GET`    | `/guilds/:guildId/channels`                  | List text channels                                  |
| `POST`   | `/guilds/:guildId/channels`                  | Create a text channel via the bot                   |
| `GET`    | `/guilds/:guildId/roles`                     | List server roles                                   |
| `POST`   | `/guilds/:guildId/roles`                     | Create a role via the bot                           |
| `GET`    | `/guilds/:guildId/leaderboard`               | Get XP leaderboard (top 10), enriched with members  |
| `POST`   | `/guilds/:guildId/ticket-panel`              | Send the ticket panel embed + button to a channel   |
| `GET`    | `/guilds/:guildId/reaction-roles`            | List reaction role configurations                   |
| `POST`   | `/guilds/:guildId/reaction-roles`            | Publish new reaction role message (full embed)      |
| `DELETE` | `/guilds/:guildId/reaction-roles/:messageId` | Delete reaction role message                        |
| `POST`   | `/guilds/:guildId/feedback-panel`            | Send the feedback panel embed + button to a channel |
| `GET`    | `/guilds/:guildId/feedback`                  | Server feedback + unread count for the current user |
| `POST`   | `/guilds/:guildId/feedback/seen`             | Mark this server's feedback as read (current user)  |
| `DELETE` | `/guilds/:guildId/feedback/:feedbackId`      | Delete a feedback submission                        |

### Moderation & Tickets (requires JWT + guild access)

| Method   | Path                                        | Description                                   |
| -------- | ------------------------------------------- | --------------------------------------------- |
| `GET`    | `/guilds/:guildId/warnings/:userId`         | List a user's warnings                        |
| `DELETE` | `/guilds/:guildId/warnings/:userId`         | Clear a user's warnings                       |
| `GET`    | `/guilds/:guildId/mod-actions`              | Recent moderation actions log                 |
| `GET`    | `/guilds/:guildId/tickets`                  | List tickets, enriched with usernames/avatars |
| `POST`   | `/guilds/:guildId/tickets/:threadId/close`  | Close (lock + archive) a ticket thread        |
| `POST`   | `/guilds/:guildId/tickets/:threadId/reopen` | Reopen a closed ticket thread                 |
| `DELETE` | `/guilds/:guildId/tickets/:threadId`        | Delete a ticket — removes the thread + DB row |

### Bot status (requires JWT)

| Method | Path          | Description                                                   |
| ------ | ------------- | ------------------------------------------------------------- |
| `GET`  | `/bot/status` | Bot online/offline (heartbeat < 90s) + username + guild count |

The `config` PUT uses an explicit allowlist — unknown fields are dropped. Editable embeds
(`welcomeEmbed`, `goodbyeEmbed`, `ticketPanelEmbed`, `levelUpEmbed`, `feedbackPanelEmbed`),
`ticketPanelButton` and `feedbackChannelId` are part of the config. Both the user OAuth token
(guild list) and the bot token (channels, roles, leaderboard, tickets, reaction roles, stats,
feedback panel) are used.

All `/guilds` endpoints require:

```
Authorization: Bearer <jwt_token>
```

JWT tokens expire after **7 days** and are delivered as an HttpOnly+Secure cookie (`jh_token`).
The Discord access token is stored server-side in MongoDB (`sessionRepository`, TTL-indexed), so
sessions survive restarts and work across scaled instances. Guild endpoints are protected by JWT
plus `canAccessGuild`: a member passes with the native Discord **Administrator** / **Manage
Server** permission, **or** the per-guild bot admin role (`adminRoleId`) — so trusted moderators
get access too. `GET /guilds` therefore returns the union of managed guilds and role-based guilds
where the bot is present (`fetchAccessibleGuilds`). A per-IP rate limiter guards against abuse
(stricter on `/auth/*`). The panel handles expiry by redirecting to the login page.

## Project Structure

```
src/
├── middleware/
│   ├── authMiddleware.ts    # JWT verification + session lookup
│   └── rateLimit.ts         # Per-IP fixed-window rate limiter
├── lib/
│   ├── sessions.ts          # Discord access-token store (MongoDB, TTL-indexed)
│   ├── configSanitize.ts    # Validates/clamps config PUT payloads
│   └── guildGuard.ts        # fetchGuilds, canAccessGuild, fetchAccessibleGuilds (cached)
├── routes/
│   ├── authRoutes.ts        # Discord OAuth2 flow
│   ├── guilds.ts            # Config, stats, channels/roles (create), leaderboard, panels, feedback
│   ├── reactionRoles.ts     # Reaction roles endpoints (full embed)
│   ├── moderation.ts        # Warnings, mod-actions, tickets (close/reopen/delete)
│   ├── feedback.ts          # Submit + list own feedback
│   └── status.ts            # Bot online/offline (heartbeat)
├── types.ts                 # Hono context types
└── index.ts                 # Entry point
```
