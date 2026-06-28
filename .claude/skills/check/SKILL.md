---
name: check
description: Run the full repo quality gate for Jurassic Haven — typecheck (db, bot, api, panel), ESLint, and the unit suite. Use before committing or whenever asked to "sprawdź"/verify the repo is green.
---

Run from the repo root, in order, and report a concise pass/fail summary:

1. `bun run typecheck` — tsc for all four workspaces (db, bot, api, panel).
2. `bun run lint` — ESLint across the whole repo.
3. `bun test` — unit suite (bun:test).

Rules:
- This is the commit-time gate. Do NOT run it after every edit (project rule
  `no-verify-each-edit`) — only before a commit or on explicit request.
- If lint fails on **formatting only**, run `bun run lint:fix`, then re-run lint.
- Report each step's exit (0 = green). Surface the first real failure with the
  relevant output. Do not claim "green" unless all three pass with exit 0.
