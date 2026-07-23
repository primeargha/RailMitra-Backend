# Study: user-service Step 1 — TypeScript Express base

## Goal
Create a runnable Express microservice skeleton in TypeScript (teacher used plain JS).

## Files
- `package.json` — scripts: `dev` (tsx), `build` (tsc + tsc-alias), `start`, `typecheck`
- `tsconfig.json` — NodeNext ESM, strict, path alias `@/*` → `./src/*`
- `src/index.ts` — Express app, `/` and `/health`
- `.env.example` — PORT, SERVICE_NAME (copy to `.env`; never commit secrets)

## Key concepts
- **Microservice:** one small service (user) with its own process/port.
- **tsx:** run/reload TypeScript in development without a build step.
- **tsc:** compile TS → JS into `dist/` for production.
- **tsc-alias:** rewrite `@/...` imports in `dist/` to real relative paths (Node cannot read tsconfig paths alone).
- **ESM (`"type": "module"`):** modern Node modules; teacher used CommonJS (`require`).

## Maps to reference
`refer_code_irctc-backend/user-service/src/index.js` → our `src/index.ts` (same idea: app + health).

## Improve later (AWS / Docker)
- Add graceful shutdown (teacher does this with Kafka disconnect).
- Structured logging (Winston) instead of `console.log`.
- Health check should later verify DB/Redis when those exist.

---

# Study log — user-service progress

## Done earlier (catch-up)

### Pino logger + request middleware
- `config/logger.ts` — Pino; pretty stream in development
- `middlewares/req.middleware.ts` — `pino-http`; silent on status >= 400 so error middleware owns error logs
- Why: structured JSON logs later help AWS CloudWatch

### Errors
- `utils/error.ts` — parent `AppError` + reusable `BadRequestError`, `NotFoundError`, etc.
- `middlewares/error.middleware.ts` — central JSON error responses; must be registered last
- Express error middleware = 4 args `(err, req, res, next)`

### Helmet, CORS, cookie-parser + strict env
- Order: cors → helmet → reqLogger → json → cookieParser (same as teacher)
- `ALLOWED_ORIGINS` from env (comma-separated)
- `required()` — app throws if any used env var is missing (fail fast for Docker/AWS)
- Helmet COOP/COEP off — prepares Google Identity popups

## This step — Prisma + Redis singletons

### Goal
One shared Prisma client and one Redis client (no duplicate connections on hot reload).

### Files
- `prisma/schema.prisma`, `prisma.config.ts`
- `src/config/prisma.ts` — globalThis singleton + `@prisma/adapter-pg`
- `src/config/redis.ts` — `RedisClient.getInstance()` singleton (ioredis)
- Env: `DATABASE_URL`, `REDIS_URL`

### Key concepts
- **Singleton:** one instance for the process
- **Prisma 7:** needs a driver adapter (`PrismaPg`) for PostgreSQL
- **globalThis trick:** stops `tsx watch` from creating a new pool every reload
- **Redis class singleton:** static instance + event listeners

### Maps to reference
- `refer_code_irctc-backend/user-service/src/config/prisma.js`
- `.../config/redis.js`

### Improve later (AWS / Docker)
- Run Postgres + Redis via Docker Compose
- Graceful shutdown: `prisma.$disconnect()` + `RedisClient.closeConnection()`
- `/health` should check DB + Redis readiness
- Connection pool sizing for concurrent users on EC2

## Upcoming (do not implement yet)
1. Docker Compose: Postgres + Redis (+ Kafka later)
2. Prisma migrate against real DB
3. Auth (email/password + Google Identity Services)
4. asyncHandler for async routes
5. Kafka producers (notifications, etc.)

## Docker Compose (infra)

- File: `server/docker-compose.yml`
- Redis image: `redis/redis-stack:6.2.6-v20` (latest patch of teacher’s 6.2.6 line)
- Others: Postgres 18, Kafka/ZK 7.9.8, ES/Kibana 8.17.0, pgAdmin 9.16, Kafka UI v0.7.2
- Local start (user-service needs): `docker compose up -d postgres redis pgadmin`
- Full stack: `docker compose up -d`

### Local URLs & credentials (from docker-compose.yml)

> Local learning only — do **not** reuse these passwords in staging/production.

| Service | URL (from host) | Credentials / notes |
|--------|------------------|---------------------|
| **PostgreSQL** | `localhost:5432` | User: `admin` · Password: `railmitrapass` · Default DB: `postgres` |
| **pgAdmin** | http://localhost:8081 | Email: `admin@admin.com` · Password: `admin` |
| **Redis** | `localhost:6379` | Password: `railmitrapass` (requirepass) |
| **Redis Insight** (stack UI) | http://localhost:8001 | Open in browser; connect to Redis with host `redis` (from containers) or `localhost` + password `railmitrapass` |
| **Kafka** (apps on host) | `localhost:9093` | No auth (PLAINTEXT_HOST). Inside Docker network use `kafka:9092` |
| **Zookeeper** | `localhost:2181` | No auth (local) |
| **Kafka UI** | http://localhost:8080 | No login by default |
| **Elasticsearch** | http://localhost:9200 | Security disabled (`xpack.security.enabled=false`) |
| **Kibana** | http://localhost:5601 | No login (ES security off) |

### Connection strings for `user-service` `.env`

```env
DATABASE_URL=postgresql://admin:railmitrapass@localhost:5432/user_service_database?schema=public
REDIS_URL=redis://:railmitrapass@localhost:6379
```

Create app DB once (default compose DB is only `postgres`):

```bash
docker exec -it railmitra-postgres psql -U admin -d postgres -c "CREATE DATABASE user_service_database;"
```

### pgAdmin → register Postgres server

- Host: `railmitra-postgres` (from another container) or `host.docker.internal` / `localhost` depending on setup; from pgAdmin container use host **`postgres`** (Compose service name) or **`railmitra-postgres`**
- Port: `5432`
- Username: `admin`
- Password: `railmitrapass`