# syntax=docker/dockerfile:1
# Monorepo wieloetapowy build (Bun). Każda usługa to osobny target — docker-compose
# wybiera go przez `target:`. Obrazy runtime jadą na `bun:1-slim` i niosą tylko to,
# czego dana usługa naprawdę potrzebuje (bot/API nie ciągną frontu ani devDeps,
# panel jedzie na minimalnym buildzie `standalone`).

# ── Zależności: pełna instalacja (potrzebna do buildu panelu) ────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/panel/package.json apps/panel/package.json
COPY packages/db/package.json packages/db/package.json
RUN bun install --frozen-lockfile

# ── Zależności produkcyjne (runtime bota/API — bez devDeps) ──────────────────────
FROM oven/bun:1 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/panel/package.json apps/panel/package.json
COPY packages/db/package.json packages/db/package.json
RUN bun install --frozen-lockfile --production

# ── Bot ─────────────────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS bot
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY packages/db ./packages/db
COPY apps/bot ./apps/bot
WORKDIR /app/apps/bot
CMD ["bun", "run", "src/index.ts"]

# ── API (Hono) ───────────────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api
WORKDIR /app/apps/api
EXPOSE 3002
CMD ["bun", "run", "src/index.ts"]

# ── Panel: build (Next standalone) ────────────────────────────────────────────────
# NEXT_PUBLIC_API_URL jest wbudowywany w bundle przy `build` — dlatego to ARG.
# Domyślnie "/api" (same-origin za reverse proxy) — nie trzeba CORS.
FROM deps AS panel-build
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
COPY . .
RUN cd apps/panel && bun run build

# ── Panel: runtime (tylko output standalone + statyki) ────────────────────────────
# Standalone to samodzielny serwer Node (z własnym minimalnym node_modules) — jedzie
# na node:alpine (kanoniczny target Next), nie potrzebuje już Buna ani frontowych deps.
FROM node:22-alpine AS panel
ENV NODE_ENV=production
# Standalone domyślnie nasłuchuje na localhost — w kontenerze musi na 0.0.0.0.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
# `outputFileTracingRoot` = korzeń repo, więc standalone zachowuje strukturę
# monorepo: server.js trafia pod apps/panel/, a node_modules do korzenia.
COPY --from=panel-build /app/apps/panel/.next/standalone ./
COPY --from=panel-build /app/apps/panel/.next/static ./apps/panel/.next/static
# (brak katalogu apps/panel/public — gdy powstanie, dołóż tu jego COPY)
EXPOSE 3000
CMD ["node", "apps/panel/server.js"]
