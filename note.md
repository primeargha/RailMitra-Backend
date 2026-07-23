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