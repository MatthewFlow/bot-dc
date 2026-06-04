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

| Route                                 | Description                                              |
| ------------------------------------- | ------------------------------------------------------- |
| `/`                                   | Landing page with Login with Discord button             |
| `/auth/success`                       | Handles OAuth2 callback, saves JWT token                |
| `/dashboard`                          | List of servers where user has admin permissions        |
| `/dashboard/[guildId]`                | Server overview — stat cards (members, bans, warnings, tickets) + quick nav |
| `/dashboard/[guildId]/welcome`        | Welcome & Goodbye config (plain text or full embed)     |
| `/dashboard/[guildId]/autorole`       | Auto-role on member join (with "create role")           |
| `/dashboard/[guildId]/levels`         | XP level → role reward tiers (with "create role")       |
| `/dashboard/[guildId]/reaction-roles` | Reaction role messages with the embed editor            |
| `/dashboard/[guildId]/moderation`     | Warnings & recent moderation actions                    |
| `/dashboard/[guildId]/tickets`        | Ticket list + panel embed/button editor + config        |
| `/dashboard/[guildId]/settings`       | Admin role + moderation log channel                     |

Every server page sits under a sticky **TopBar** (breadcrumb + user menu) and the navigation
**Sidebar**, both driven by the shared `lib/nav.ts` map.

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
│           ├── layout.tsx                # Sidebar + TopBar layout
│           ├── page.tsx                  # Server overview (stat cards + nav)
│           ├── welcome/page.tsx          # Welcome/Goodbye (text or embed)
│           ├── autorole/page.tsx         # Auto-role config
│           ├── levels/page.tsx           # Level → role tiers
│           ├── reaction-roles/page.tsx   # Reaction roles (embed editor)
│           ├── moderation/page.tsx       # Warnings + mod-action log
│           ├── tickets/page.tsx          # Tickets + panel embed editor
│           └── settings/page.tsx         # Admin role + mod-log channel
├── components/
│   ├── Sidebar.tsx                       # Navigation sidebar (mobile + desktop)
│   ├── TopBar.tsx                        # Sticky breadcrumb + user/logout
│   ├── Skeleton.tsx                      # Loading skeleton
│   ├── Avatar.tsx                        # Discord user avatar
│   ├── ChannelSelect.tsx                 # Channel picker dropdown
│   ├── RoleSelect.tsx                    # Role picker dropdown
│   ├── CreateChannelButton.tsx           # Inline "create channel" via bot
│   ├── CreateRoleButton.tsx              # Inline "create role" via bot
│   ├── EmbedEditor.tsx                   # Full Discord embed editor
│   ├── EmbedPreview.tsx                  # Live Discord-style embed preview
│   ├── SaveButton.tsx                    # Submit button with loading state
│   ├── PageHeader.tsx                    # Section title + description
│   ├── HowItWorks.tsx                    # Collapsible help block
│   ├── confirmModal.tsx                  # Delete confirmation dialog
│   └── toast.tsx                         # Toast notification
├── hooks/
│   └── useGuildLoad.ts                   # Generic guild-page data loader
└── lib/
    ├── api.ts                            # Typed API client (fetch wrapper)
    ├── embed.ts                          # Embed color/variable helpers
    └── nav.ts                            # Shared navigation map (icons + routes)
```

Icons are provided by [lucide-react](https://lucide.dev).

## Authentication Flow

1. User clicks **Login with Discord** on the landing page
2. Redirected to `http://localhost:3002/auth/discord`
3. Discord OAuth2 authorization
4. API exchanges code for access token, generates JWT
5. JWT stored in `localStorage` as `jh_token`
6. All API requests use `Authorization: Bearer <token>`
