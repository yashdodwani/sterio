# Stage 1: Install dependencies
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile || bun install

# Stage 2: Production image
FROM oven/bun:1-slim AS production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY test-chat.html ./
COPY src/ ./src/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "bun run src/db/migrate.ts && exec bun run src/index.ts"]
