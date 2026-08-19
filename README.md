# r2-hex

Hexagonal-architecture file-upload API: **Elysia + tsyringe + Drizzle ORM + PostgreSQL + Cloudflare R2 (AWS S3 SDK)**.

## Install

```bash
bun install
```

## Run

```bash
bun run api:dev        # standalone server on http://localhost:3000
# or
bun run dev            # bun --watch server/standalone.ts
```

OpenAPI docs: <http://localhost:3000/api/openapi>

## Other commands

```bash
bun run typecheck      # tsc --noEmit
bun test               # vitest (watch)
bun run test:run       # vitest run
bun run db:generate    # drizzle-kit generate
bun run db:migrate     # drizzle-kit migrate
bun run db:studio      # drizzle-kit studio
```

## Structure

```
server/
├─ app.ts              # ประกอบ Elysia app (prefix /api, error handler, CORS, OpenAPI) + wire DI modules
├─ standalone.ts       # entry point: ฟัง port (สำหรับ dev/testing)
├─ domains/            # shared domain types (image.domain.ts)
├─ lib/
│  ├─ app-error-handler.ts
│  ├─ env.ts           # r2Env, dbEnv
│  └─ http-error.factory.ts
├─ database/
│  ├─ index.ts         # db instance (drizzle + node-postgres)
│  └─ schema/index.ts  # ตาราง DB (images)
├─ gateway/
│  └─ blob-storage/    # gateway ไปยัง R2 — ใช้ได้กับโปรเจกต์อื่นเลย
└─ modules/
   └─ images/          # module หลัก (hexagonal)
```

See `structure.md` for the full hexagonal-architecture breakdown.
