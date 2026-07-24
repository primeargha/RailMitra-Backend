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
1. Prisma migrate against real DB
2. Auth registration OTP flow (uses `emailService.sendOtpEmail`)
3. asyncHandler for async routes
4. Kafka producers (notifications, etc.)
5. Optional: `SendGridEmailProvider` implementing the same interface

## Email module — patterns, SoC, thought process (study)

### What we built (files)

| Layer | Path | Responsibility |
|-------|------|----------------|
| Types / contract | `providers/email/email.types.ts` | `EmailProvider` + `SendEmailInput` — “what every mailer must do” |
| Adapter (Resend) | `providers/email/resend.provider.ts` | Talks to Resend SDK only; maps our input → Resend API |
| Factory | `providers/email/email.factory.ts` | Picks which provider from `EMAIL_PROVIDER` env |
| Templates | `templates/email.templates.ts` | HTML only (OTP / welcome) — no SDK, no business rules |
| Application service | `services/email.service.ts` | Product actions: `sendOtpEmail`, `sendWelcomeEmail` |

```
Registration / OTP (future)
        │
        ▼
 emailService.sendOtpEmail(...)     ← app language (“send OTP”)
        │
        ▼
 EmailProvider.send({ to, subject, html })   ← stable contract
        │
        ├── ResendEmailProvider     ← Resend SDK
        └── SendGridEmailProvider   ← later, same contract
```

### Thought process (why this shape)

1. **Auth should not know Resend.** Signup/OTP cares about “send this OTP email,” not `resend.emails.send(...)`.
2. **We will switch vendors** (teacher = SendGrid, we = Resend, AWS later = SES). Hardcoding one SDK = painful rewrite.
3. **HTML templates change independently** of which vendor sends them.
4. **Config chooses the vendor** (`EMAIL_PROVIDER=resend`) so deploy/env can switch without code edits in auth.
5. **Same LLD as payment gateways** in our project plan: common interface + per-vendor implementation + factory.

### Separation of concerns (who owns what)

| Concern | Owner | Must NOT do |
|---------|--------|-------------|
| “Which product email?” (OTP vs welcome) | `email.service` | Call Resend/SendGrid APIs |
| “How does HTTP to Resend work?” | `resend.provider` | Know OTP rules or auth flows |
| “Which vendor?” | `email.factory` + env | Contain HTML or auth logic |
| “What does the email look like?” | `email.templates` | Import SDKs or read DB |
| “Is user allowed / OTP valid?” | auth service (later) | Send raw vendor API calls |

This is **separation of concerns**: each file has one reason to change.

### Is this the Adapter pattern?

**Yes — primarily Adapter (GoF), used for vendor integration.**

- **Target interface:** `EmailProvider` (what *our* app expects)
- **Adaptee:** Resend SDK (third-party API we can’t change)
- **Adapter:** `ResendEmailProvider` wraps Resend and exposes `send()` in *our* shape

So: *adapt an external library to our internal interface.*

### Adapter in easy words + small example

**Idea:** Resend speaks its own language. Our app wants a simple language: `send({ to, subject, html })`.  
The adapter is the **plug** that makes Resend fit our socket.

```
App → EmailProvider.send() → ResendEmailProvider → Resend SDK
         (our words)            (translator)         (vendor words)
```

**Why useful:** switch to SendGrid later by adding another plug; OTP/auth code stays the same.

### Why write `implements EmailProvider`?

`implements EmailProvider` means: “TypeScript, please check that this class really has everything `EmailProvider` promises” (mainly a `send` method).

**Tiny example:**

```ts
interface EmailProvider {
  send(input: { to: string; subject: string; html: string }): Promise<{ id?: string }>;
}

// ✅ TypeScript checks this class matches the interface
class ResendEmailProvider implements EmailProvider {
  async send(input: { to: string; subject: string; html: string }) {
    // call Resend SDK here...
    return { id: "abc" };
  }
}

// ❌ If you forget send(), TypeScript errors WHILE you code
class BrokenProvider implements EmailProvider {
  // missing send → compile error
}
```

**If we remove `implements EmailProvider`?**

- **Node at runtime:** can still work if `send` exists (JS does not care about interfaces).
- **TypeScript:** no automatic check on that class → easier to break the adapter by mistake.
- Factory may still accept it if the *shape* matches (structural typing), but you lose the safety net.

**Keep `implements`:** clarity + early errors. That is what makes the adapter contract real in TypeScript.

We also use:

| Pattern | Where | Role |
|---------|--------|------|
| **Adapter** | `ResendEmailProvider` | Make Resend look like `EmailProvider` |
| **Strategy** (runtime choice) | factory + `EMAIL_PROVIDER` | Swap algorithm/vendor at runtime |
| **Factory** | `createEmailProvider()` | Construct the right strategy/adapter |
| **Facade** (light) | `emailService` | Simpler API for the rest of the app (`sendOtpEmail` vs raw `send`) |

In industry talk people often say **“email provider”** or **“provider pattern”** for this folder naming. That is usually **not** a separate GoF pattern — it’s everyday language for “pluggable implementation behind an interface.”

### Adapter vs “Provider pattern” — how to think about it

| | **Adapter (GoF)** | **“Provider” (common naming)** |
|--|-------------------|--------------------------------|
| Origin | Gang of Four design pattern | Naming convention / DI style (esp. .NET “providers”, cloud SDKs) |
| Focus | Wrap an *existing incompatible* API so it matches *our* interface | Supply a capability (email, storage, auth) behind a swap point |
| Typical trigger | “Vendor SDK ≠ our interface” | “We need a pluggable mailer” |
| Our code | `ResendEmailProvider` **is** an adapter | Folder `providers/email` **names** the capability |

**In practice for RailMitra:** we are doing **Adapter + Strategy + Factory**. Calling the implementations “providers” is fine and common; it does **not** mean a different design. If someone says “provider pattern,” they usually mean *dependency inversion / pluggable implementations* — overlapping with Strategy, often implemented *as* Adapters when wrapping third parties.

**Payment module later:** same idea — `PaymentGateway` interface + Razorpay/Stripe adapters + factory. Naming may say “gateway” instead of “provider”; the LLD is the same.

### How to switch to SendGrid later (no auth rewrite)

1. Add `SendGridEmailProvider implements EmailProvider`
2. Add `case "sendgrid":` in the factory
3. Set `EMAIL_PROVIDER=sendgrid` + SendGrid env keys
4. `emailService` and future registration code stay unchanged

### Teacher vs us

- Teacher: SendGrid calls inside notification `EmailService` (coupled to one vendor).
- Us: vendor behind `EmailProvider`; Resend first; SendGrid can be added as another adapter.
- Later HLD: Kafka → notification-service can still call the same interface at the send boundary.

### Improve later

- Conditional env validation (`RESEND_API_KEY` only if provider is resend)
- Retries (teacher’s `sendWithRetry`) inside provider or a wrapper
- Move actual send to notification-service; user-service only queues events

## Architecture decision — Email (short)

- **Default:** Resend · **Teacher:** SendGrid · **Rule:** never call vendor SDKs from auth directly
- Switch via env + new adapter class

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