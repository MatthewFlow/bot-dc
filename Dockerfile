# syntax=docker/dockerfile:1
# Monorepo wieloetapowy build (Bun). Każda usługa to osobny target — docker-compose
# wybiera go przez `target:`. Warstwa `deps` jest współdzielona (cache instalacji).

# ── Zależności (cache na podstawie samych manifestów) ───────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/bot/package.json apps/bot/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/panel/package.json apps/panel/package.json
COPY packages/db/package.json packages/db/package.json
RUN bun install --frozen-lockfile

# ── Pełne źródła ────────────────────────────────────────────────────────────────
FROM deps AS source
COPY . .

# ── Bot ─────────────────────────────────────────────────────────────────────────
FROM source AS bot
ENV NODE_ENV=production
WORKDIR /app/apps/bot
CMD ["bun", "run", "src/index.ts"]

# ── API (Hono) ───────────────────────────────────────────────────────────────────
FROM source AS api
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3002
CMD ["bun", "run", "src/index.ts"]

# ── Panel (Next.js) ───────────────────────────────────────────────────────────────
# NEXT_PUBLIC_API_URL jest wbudowywany w bundle przy `build` — dlatego to ARG.
# Domyślnie "/api" (same-origin za reverse proxy) — nie trzeba CORS.
FROM source AS panel
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
WORKDIR /app/apps/panel
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
