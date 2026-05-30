# Jurassic Haven — API

REST API for the Jurassic Haven dashboard. Handles Discord OAuth2 authentication, server configuration and reaction roles.

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

# ── DATABASE ───────────────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/jurassic-haven

# ── DISCORD OAUTH2 ─────────────────────────────────────────────────
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:3002/auth/callback
DISCORD_TOKEN=

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

### Guilds (requires JWT)

| Method   | Path                                         | Description                       |
| -------- | -------------------------------------------- | --------------------------------- |
| `GET`    | `/guilds`                                    | List servers where user is admin  |
| `GET`    | `/guilds/:guildId/config`                    | Get server configuration          |
| `PUT`    | `/guilds/:guildId/config`                    | Update server configuration       |
| `GET`    | `/guilds/:guildId/channels`                  | List text channels                |
| `GET`    | `/guilds/:guildId/roles`                     | List server roles                 |
| `GET`    | `/guilds/:guildId/leaderboard`               | Get XP leaderboard (top 10)       |
| `GET`    | `/guilds/:guildId/reaction-roles`            | List reaction role configurations |
| `POST`   | `/guilds/:guildId/reaction-roles`            | Publish new reaction role message |
| `DELETE` | `/guilds/:guildId/reaction-roles/:messageId` | Delete reaction role message      |

All `/guilds` endpoints require:

```
Authorization: Bearer <jwt_token>
```

JWT tokens expire after **7 days**. The panel handles expiry automatically by redirecting to the login page.

## Project Structure

```
src/
├── middleware/
│   └── authMiddleware.ts    # JWT verification
├── routes/
│   ├── authRoutes.ts        # Discord OAuth2 flow
│   ├── guilds.ts            # Guild config + leaderboard endpoints
│   └── reactionRoles.ts     # Reaction roles endpoints
├── types.ts                 # Hono context types
└── index.ts                 # Entry point
```
