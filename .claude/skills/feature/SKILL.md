---
name: feature
description: Scaffold/checklist for a new cross-stack feature in Jurassic Haven across the four layers (packages/db → apps/bot → apps/api → apps/panel), following the repo conventions. Use when starting a feature like giveaways/sticky/auto-voice/reminders.
---

Build the feature layer by layer in this order, then verify with `/check` + `/smoke`.

### 1. packages/db
- Schema: `providers/mongoose/schemas/<name>.schema.ts` (+ indexes; a field with
  `unique: true` already has an index — don't add a duplicate `schema.index`).
- Shared types in `types.ts` (NO mongoose import — the panel mirrors these shapes).
- Repository interface `repositories/<name>Repository.ts` + Mongoose provider
  `providers/mongoose/<name>Provider.ts`.
- Wire singleton in `providers/mongoose/providers.ts`; export repo + types from
  `index.ts` (keep import/export lists alphabetical for the lint sorter).
- Pure logic → its own function + `*.test.ts` (e.g. `pickWinners`, `parseDuration`).

### 2. apps/bot
- Feature dir with the handler; wire in `bot.ts`: buttons via `custom_id` prefix in
  the `isButton()` branch, listeners via `client.on(...)`, sweeps via `startXxx` in
  `clientReady`, cleanup-on-restart if it owns Discord state.
- New slash commands → define in `commands/register.ts` AND add to the dispatch map
  in `commands/handlers/handler.ts`.
- Hot paths (`messageCreate`, `voiceStateUpdate`) read config via the 15s cache; add
  a per-guild cache (TTL ~30s) for any new hot DB lookup.
- Replies: `flags: MessageFlags.Ephemeral` (the `ephemeral: true` option is deprecated).

### 3. apps/api
- Route `routes/<name>.ts` — `authMiddleware` + `guildAccessGuard` on `/:guildId/*`;
  `channelInGuild` before posting to any channel from the body.
- Config fields: add to `CONFIG_ALLOWED_FIELDS` (routes/guilds.ts) AND sanitize in
  `lib/configSanitize.ts`.
- Mount the router in `index.ts`.

### 4. apps/panel
- Types in `lib/api/types.ts`; client in `lib/api/<name>.ts` + re-export in barrel
  `lib/api.ts`; query keys in `lib/api/core.ts`; hook in `hooks/queries.ts`.
- Page `app/dashboard/[guildId]/<name>/page.tsx` — reuse `EntitySelect`/`ChannelSelect`,
  `EmbedEditor`/`EmbedPreview`, `SaveButton`, `ConfirmModal`, `useConfigDraft`.
- Nav entry in `lib/nav.ts`. Components PascalCase; imports use `@/components/Toast`,
  `@/components/ConfirmModal`, `@/components/Badges`.
- Don't import `@jurassic-haven/db` into the panel (drags mongoose into next dev).

### 5. Verify & commit
- `/check`, then `/smoke <route>` for any new page.
- Commit per repo convention (no Co-Authored-By trailer). Run `.mjs` codemod/scripts
  with `node`, not `bun` (bun chokes on the Playwright import).
