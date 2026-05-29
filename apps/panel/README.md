# Jurassic Haven — Panel

Web dashboard for configuring the Jurassic Haven Discord bot. Built with Next.js and Discord OAuth2.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) 16+
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Auth:** Discord OAuth2 (via Jurassic Haven API)

## Requirements

- Bun v1.2 or newer
- [apps/api](../api/README.md) running on port 3002

## Installation

```bash
# From monorepo root
bun install
```

## Configuration

Create `.env` in `apps/panel/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Running

```bash
cd apps/panel
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

| Route                           | Description                                      |
| ------------------------------- | ------------------------------------------------ |
| `/`                             | Landing page with Login with Discord button      |
| `/auth/success`                 | Handles OAuth2 callback, saves JWT token         |
| `/dashboard`                    | List of servers where user has admin permissions |
| `/dashboard/[guildId]`          | Server overview                                  |
| `/dashboard/[guildId]/welcome`  | Welcome & Goodbye channel configuration          |
| `/dashboard/[guildId]/autorole` | Auto-role on member join configuration           |
| `/dashboard/[guildId]/levels`   | XP level → role reward tiers                     |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout
│   ├── globals.css                       # Global styles
│   ├── auth/
│   │   └── success/
│   │       └── page.tsx                  # OAuth2 token handler
│   └── dashboard/
│       ├── page.tsx                      # Server list
│       └── [guildId]/
│           ├── layout.tsx                # Sidebar layout
│           ├── page.tsx                  # Server overview
│           ├── welcome/
│           │   └── page.tsx              # Welcome/Goodbye config
│           ├── autorole/
│           │   └── page.tsx              # Auto-role config
│           └── levels/
│               └── page.tsx              # Level → role tiers
├── components/
│   └── sidebar.tsx                       # Navigation sidebar
└── lib/
    └── api.ts                            # API client functions
```

## Authentication Flow

1. User clicks **Login with Discord** on the landing page
2. Redirected to `http://localhost:3002/auth/discord`
3. Discord OAuth2 authorization
4. API exchanges code for access token, generates JWT
5. JWT stored in `localStorage` as `jh_token`
6. All API requests use `Authorization: Bearer <token>`
