# COMA Polkadot

AI-powered shopping assistant that lets users search products, manage a cart, and checkout with crypto — all through a conversational chat interface backed by an LLM agent.

## Architecture

```
┌─────────────┐       ┌──────────────┐       ┌──────────────────┐
│   Frontend  │──────▶│   Backend    │──────▶│     Scraping     │
│  Next.js 16 │ HTTP  │  Bun + Hono  │ HTTP  │     NestJS       │
│  React 19   │cookies│  Effect      │       │                  │
└─────────────┘       └──────┬───────┘       └───┬──────┬───────┘
                             │                   │      │
                        PostgreSQL          PostgreSQL  Meilisearch
                        (Drizzle)           (TypeORM)      │
                             │                   │      Redis
                        ┌────┴────┐         ┌────┴────┐
                        │Crossmint│         │Browser  │
                        │OpenRouter│        │Use/Apify│
                        └─────────┘         └─────────┘
```

The system is a monorepo with three independent apps in `apps/`:

| App | Runtime | Framework | Database | Purpose |
|-----|---------|-----------|----------|---------|
| **backend** | Bun | Hono + Effect | PostgreSQL (Drizzle) | ReAct chat agent, cart, checkout, auth |
| **scraping** | Node.js | NestJS | PostgreSQL (TypeORM) + Meilisearch + Redis | Product search, sync, blockchain payments & utils |
| **frontend** | Node.js | Next.js 16 (App Router) | — | Chat UI, shopping cart, wallet |

## Prerequisites

- [Bun](https://bun.sh/) (backend)
- [Node.js](https://nodejs.org/) 20+ (scraping, frontend)
- [Docker](https://www.docker.com/) (scraping infrastructure)
- PostgreSQL database (backend uses [Neon](https://neon.tech/))

## Getting Started

### 1. Scraping Service (infrastructure + API)

Start the required infrastructure:

```bash
cd apps/scraping
docker-compose up -d    # Postgres, Redis, Meilisearch, pgAdmin
```

Create a `.env` file with:

```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres_password
DB_DATABASE=amazon_shopping_agent
DB_SYNCHRONIZE=true

# Search
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_meilisearch_master_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Product scraping (at least one)
BROWSER_USE_API_KEY=
APIFY_API_TOKEN=

# AI
OPENAI_API_KEY=

# Polkadot
POLKADOT_MERCHANT_ADDRESS=
```

```bash
npm install
npm run dev
```

### 2. Backend (chat agent + API)

```bash
cd apps/backend
```

Create a `.env` file with:

```env
# Required
DATABASE_URL=postgresql://...
CROSSMINT_SERVER_API_KEY=
OPENROUTER_API_KEY=

# Optional
LLM_MODEL=openai/gpt-4o
PRODUCT_SERVICE=mock              # "mock" or "scraping"
SCRAPING_SERVICE_URL=http://localhost:3000
SCRAPING_SERVICE_API_KEY=
REDIS_URL=redis://localhost:6379
CROSSMINT_API_URL=https://staging.crossmint.com
PAS_TO_USDC_RATE=1
DEPOSIT_WEBHOOK_SECRET=
```

```bash
bun install
bun run db:migrate      # Apply database migrations
bun run dev             # Start dev server (port 3000)
```

### 3. Frontend

```bash
cd apps/frontend
```

Create a `.env.local` file with:

```env
NEXT_PUBLIC_CROSSMINT_API_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3000   # Backend URL
```

```bash
npm install
npm run dev
```

The frontend proxies `/api/*` requests to the backend and `/api/payment/*` to the scraping service via Next.js rewrites.

## Development

### Backend

```bash
bun run dev              # Dev server with watch
bun test                 # Run tests
bun run db:generate      # Generate new Drizzle migration after schema changes
bun run db:migrate       # Apply pending migrations
bun run db:studio        # Open Drizzle Studio (DB GUI)
```

Swagger UI available at `/swagger` when the server is running.

### Scraping

```bash
npm run dev              # NestJS watch mode
npm test                 # Jest unit tests
npm run test:e2e         # End-to-end tests
npm run lint             # ESLint with auto-fix
npm run build            # Production build
```

Docker services:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Meilisearch: `localhost:7700`
- pgAdmin: `localhost:5050` (admin@example.com / admin_password)

### Frontend

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run lint             # ESLint
npm run gen:api          # Regenerate TypeScript types from backend OpenAPI spec
```
