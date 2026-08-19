# r2-hex — โครงสร้างโปรเจกต์ทีละส่วน

โปรเจกต์ Elysia + Drizzle + PostgreSQL + Cloudflare R2 (AWS S3 SDK) ตาม Hexagonal Architecture

```
r2-hex/
├─ drizzle/                          # migration files ที่ generate โดย drizzle-kit
├─ server/
│  ├─ app.ts                         # ประกอบ Elysia app (prefix /api) + wire DI modules
│  ├─ standalone.ts                  # entry point: ฟัง port (dev/testing)
│  ├─ domains/                       # shared domain types (image.domain.ts)
│  ├─ lib/
│  │  ├─ app-error-handler.ts        # error handler กลาง (onError)
│  │  ├─ env.ts                      # อ่าน env vars (r2Env, dbEnv)
│  │  └─ http-error.factory.ts       # HTTP error classes (NotFoundError, UnsupportedMediaTypeError, ...)
│  ├─ database/
│  │  ├─ index.ts                    # db instance (drizzle + node-postgres/pg)
│  │  └─ schema/index.ts             # นิยามตาราง DB (images)
│  ├─ gateway/
│  │  └─ blob-storage/               # gateway ไปยัง external (R2) — คัดลอกไปโปรเจกต์อื่นได้เลย
│  │     ├─ blob-storage.module.ts   # ลงทะเบียน DI: token → adapter
│  │     ├─ applications/ports/      # interface (port) + DI token
│  │     └─ adapters/repository/     # implement R2/S3 (adapter)
│  └─ modules/
│     └─ images/                     # module หลัก: business logic รูปภาพ
│        ├─ images.module.ts         # ลงทะเบียน DI: image repository
│        ├─ applications/
│        │  ├─ usecases/             # business logic ล้วนๆ (+ *.usecase.test.ts)
│        │  └─ ports/                # interface ของ DB (IImageRepository)
│        └─ adapters/
│           ├─ controllers/          # HTTP routes (registerRoutes/getRoutes) + schemas/ + *.http
│           └─ repository/           # implement port ด้วย Drizzle
└─ .env / .env.example               # config (DATABASE_URL, R2_*)
```

---

## 1. หลักการ Hexagonal ที่ใช้

ทิศทาง dependency ชี้เข้าหากลางเสมอ: **controller → use case → port ← adapter**

```
        Controller (รับ HTTP)
              │ เรียก
              ▼
         Use Case (business logic)
              │ เรียกผ่าน port (interface)
              ▼
┌── Port (interface) ──────────────┐
│                                  │
│  ▲ implement                     │  ▲ implement
│  │                               │  │
└──┴───────────────────────────────┴──┘
   BlobStorageAwsRepository     ImageDrizzleRepository
   (R2 adapter)                (DB adapter)
```

- **ชั้นใน (usecase)** ไม่รู้ว่าข้างนอก implement ยังไง — รู้แค่ interface
- **ชั้นนอก (adapter)** เป็นคน implement interface — สลับ R2 → S3 → MinIO ได้โดยไม่แตะ usecase
- **DI module** เป็นคนต่อสาย: `token` → `implementation`

---

## 2. `server/lib/` — ตั้งค่า env + errors

### `env.ts`
อ่านค่าจาก `process.env` (Bun โหลด `.env` ให้อัตโนมัติ):

```typescript
export const r2Env = {
  accessKeyId,                        // R2_ACCESS_KEY_ID
  accountId,                          // R2_ACCOUNT_ID
  bucketName,                         // R2_BUCKET_NAME
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  region: 'auto',
  secretAccessKey,                    // R2_SECRET_ACCESS_KEY
  credentials: { accessKeyId, secretAccessKey },
};
```

### `errors.ts`
`NotFoundError` ใช้บอก "ไม่เจอข้อมูล" — index.ts map ให้กลายเป็น HTTP 404

---

## 3. `server/database/` — Drizzle + Postgres

### `schema/index.ts` — นิยามตาราง
```typescript
export const images = pgTable('images', {
  id: serial('id').primaryKey(),
  refId: integer('ref_id'),          // ไอดีของ entity ที่รูปเป็นของ (nullable)
  imagePath: text('image_path'),     // เก็บแค่ key ใน R2 เช่น images/abc-123.jpg
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()).notNull(),
});
```
DB เก็บ **แค่ key** — ตัวไฟล์อยู่ที่ R2

### `index.ts` — db instance
```typescript
const queryClient = postgres(dbEnv.url);
export const db = drizzle(queryClient, { schema });
```

### `drizzle/` — migrations
`bun run db:generate` สร้าง SQL จาก schema → `bun run db:migrate` apply ลง DB

---

## 4. `server/gateway/blob-storage/` — port ไปยัง R2

Gateway = โฟลเดอร์ที่คัดลอกไปโปรเจกต์อื่นได้ทันที (ตาม md ระบุ)

### `applications/ports/blob-storage.repository.ts` — **port**
```typescript
export interface IBlobStorageRepository {
  deleteObject(fullPath: string): Promise<void>;
  getPresignedDownloadUrl(args): Promise<string>;
  getPresignedUploadUrl(args): Promise<string>;
}
const blobStorageRepositoryToken = Symbol('BlobStorageRepository').toString();
```
เป็นแค่ interface + DI token — **ไม่มี logic**

### `adapters/repository/blob-storage.aws.repository.ts` — **adapter (R2)**
- สร้าง `S3Client` ชี้ endpoint R2
- `getPresignedUploadUrl` → `PutObjectCommand` + `getSignedUrl` (อายุ 5 นาที)
- `getPresignedDownloadUrl` → `GetObjectCommand` + `getSignedUrl` (อายุ 30 วิ)
- `deleteObject` → `DeleteObjectCommand`

### `blob-storage.module.ts` — **DI wiring**
```typescript
container.registerSingleton(blobStorageRepositoryToken, BlobStorageAwsRepository);
```

---

## 5. `server/modules/images/` — business logic รูปภาพ

### `applications/ports/image.repository.ts` — **port ของ DB**
```typescript
export interface IImageRepository {
  findById(id: number): Promise<IImage | null>;
  update(id: number, input: IImageUpdateInput): Promise<IImage>;
}
```

### `applications/usecases/` — **3 use cases** (ไม่รู้ว่าใคร implement port)

| ไฟล์ | ทำอะไร | เรียก port ไหน |
|---|---|---|
| `get-presigned-upload-url.usecase.ts` | ตรวจ mime → สร้าง key `images/<uuid>.<ext>` → ขอ presigned PUT | BlobStorage |
| `confirm-image-upload.usecase.ts` | ตรวจพบ entity → อัปเดต image_path → ลบรูปเก่าใน R2 (ถ้าเปลี่ยน) | Image + BlobStorage |
| `get-image.usecase.ts` | อ่าน image_path → ขอ presigned GET (ขอใหม่ทุกครั้ง อายุ 30 วิ) | Image + BlobStorage |

### `adapters/repository/image.drizzle.ts` — **adapter ของ DB**
implement `IImageRepository` ด้วย Drizzle (`select`, `update ... returning`)

### `adapters/controllers/` — **HTTP layer**
- `image.controller.ts` — ต่อ routes เข้ากับ usecases ผ่าน DI
- `schemas/image.schema.ts` — Elysia body/params schema (`t.Object`, `t.Numeric`)

### `images.module.ts` — **DI wiring**
```typescript
container.registerSingleton(imageRepositoryToken, ImageDrizzleRepository);
```

---

## 6. `server/app.ts` + `server/standalone.ts` — bootstrap

`app.ts` ประกอบ Elysia app (ไม่ listen — เอาไปเทสต์/ยิงได้):

```typescript
import 'reflect-metadata';               // ต้อง import ก่อน tsyringe
import './gateway/blob-storage/blob-storage.module';   // ลงทะเบียน DI
import './modules/images/images.module';
import { handleAppError } from './lib/app-error-handler';

const imageController = container.resolve(ImageController);

export const app = new Elysia({ prefix: '/api' })
  .onError(handleAppError)
  .use(cors())
  .use(openapi())
  .use(imageController.getRoutes());
```

`standalone.ts` เป็น entry point ที่เรียก listen แล้ว:

```typescript
import { app } from './app';
const server = app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
```

---

## 7. Flow การทำงานของ API

```
POST /uploads/presigned-upload { contentType }
  → GetPresignedUploadUrlUseCase
  → { presignedUrl, key }        (browser PUT ไฟล์ตรงไป R2)

POST /images/:id/confirm-upload { key }
  → ConfirmImageUploadUseCase
  → อัปเดต image_path + ลบรูปเก่า

GET /images/:id/image
  → GetImageUseCase
  → { imageUrl }                 (presigned GET อายุ 30 วิ ขอใหม่ทุกครั้ง)
```

---

## สรุปแนวคิดสำคัญ

1. **DB เก็บแค่ `key`** — ไฟล์อยู่ที่ R2
2. **Browser upload ตรงไป R2** ผ่าน presigned URL — ไม่ลากไฟล์ผ่าน server
3. **ชั้นในรู้แค่ interface** — สลับ implementation ได้โดยไม่แตะ logic
4. **อย่าเก็บ presigned URL ใน DB** — อายุสั้น ต้องขอใหม่ทุกครั้ง
