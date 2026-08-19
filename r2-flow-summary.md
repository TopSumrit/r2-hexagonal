# สรุป Cloudflare R2 + Flow การ Upload / Get รูปภาพ

> สรุปจาก code จริงในโปรเจกต์นี้: **Elysia + tsyringe + Drizzle ORM + PostgreSQL + Cloudflare R2 (ผ่าน AWS S3 SDK)**
> ดูรายละเอียดการ setup แบบลึกได้ที่ `r2 setup.md`

---

## 1. Cloudflare R2 คืออะไร

**Cloudflare R2 (R2 Object Storage)** คือบริการ **object storage แบบ S3-compatible** ของ Cloudflare
— ใช้เก็บไฟล์ (รูป, วิดีโอ, backup, static asset) แบบเดียวกับ AWS S3 แต่มีจุดขายที่ต่างออกไป

- เก็บข้อมูลเป็น **object** (ไฟล์ + metadata) ใน **bucket**
- **API เข้ากันได้กับ S3** → ใช้ AWS SDK ได้เลย (ในโปรเจกต์นี้ใช้ `@aws-sdk/client-s3`)
- ไม่มีค่าใช้จ่าย **egress (ค่าดาวน์โหลดข้อมูลออกจาก service)** — ต่างจาก S3 ที่คิดค่า egress
- เปิดใช้ presigned URL ได้ (PUT สำหรับ upload, GET สำหรับ download ที่หมดอายุได้) ตาม pattern ในโปรเจกต์นี้

---

## 2. ประโยชน์ของ Cloudflare R2

| ประโยชน์ | รายละเอียด |
|---|---|
| **ไม่มีค่า egress** | ดาวน์โหลด/ส่งข้อมูลออกฟรี — เหมาะกับรูปภาพที่ถูกเรียกดูบ่อย (S3 คิดค่า egress ต่อ GB) |
| **S3-compatible** | ใช้ AWS SDK / เครื่องมือ S3 เดิมได้เลย ย้ายมาจาก S3 ง่าย ไม่ต้องแก้โค้ดเยอะ |
| **รองรับ Presigned URL** | ให้ client upload/download ตรงๆ โดยไม่ต้องเปิด bucket เป็น public และไม่ต้องลากไฟล์ผ่าน server |
| **Edge Network ของ Cloudflare** | เนื้อหาเสิร์ฟจาก edge (ใกล้ผู้ใช้) → โหลดเร็วทั่วโลก, มี CDN ในตัว |
| **ปลอดภัย** | IAM / API token แบบ S3, สร้าง URL หมดอายุได้, เก็บข้อมูลแบบ encrypted |
| **ราคาจับต้องได้** | ค่า storage ถูกกว่า S3 ในหลายกรณี + ไม่มีค่า egress → ควบคุมค่าใช้จ่ายง่าย |
| **ค่า maintenance ต่ำ** | เป็น managed service — ไม่ต้องดูแล server/disk เอง, scale อัตโนมัติ |

### ตัวอย่างค่าใช้จ่ายโดยคร่าว (เทียบกับ S3)
- **S3:** จ่ายทั้ง storage + **egress ทุก GB ที่ดึงออก**
- **R2:** จ่ายเฉพาะ storage (+ ค่า request) — egress ฟรี

> ถ้าโปรเจกต์เน้นเสิร์ฟรูป/ไฟล์ให้ผู้ใช้จำนวนมาก R2 จะประหยัดกว่ามาก และโค้ดแทบไม่ต่างจาก S3

---

## 3. Flow การทำงาน

### หลักการสำคัญ

- **DB (PostgreSQL) เก็บแค่ `image_path` (key) ของรูป** — ไม่เก็บไฟล์
- **ตัวไฟล์อยู่ที่ Cloudflare R2**
- **Browser/Frontend upload ตรงไปที่ R2** ผ่าน presigned URL ที่มีอายุสั้น → ไฟล์ไม่ต้องลากผ่าน server
- ทุก URL ที่ให้ client ใช้เป็น **presigned URL (มีอายุจำกัด)** ไม่ได้เปิด bucket เป็น public

### แผนผังโดยรวม

```
[Frontend]                      [Backend: Elysia]                  [Cloudflare R2]
     │                                  │                               │
     │ 1. POST /api/uploads/presigned-upload                          │
     │    { contentType: "image/jpeg" }                               │
     │─────────────────────────────────>│                             │
     │                                  │ GetPresignedUploadUrlUseCase│
     │                                  │  - ตรวจ mime type           │
     │                                  │  - สร้าง key = images/<uuid>.jpg
     │                                  │  - ขอ presigned PUT URL ───>│
     │  <── { presignedUrl, key } ───── │                             │
     │                                  │                             │
     │ 2. PUT <presignedUrl> (ตัวไฟล์)  │                             │
     │    ตรงไปที่ R2 ไม่ผ่าน backend ─────────────────────────────────>│  รูปถูกเก็บที่ R2
     │                                  │                             │
     │ 3. POST /api/images/:id/confirm-upload                         │
     │    { key }                       │                             │
     │─────────────────────────────────>│ ConfirmImageUploadUseCase   │
     │                                  │  - update image_path ใน DB  │
     │                                  │  - ลบรูปเก่าใน R2 (ถ้ามี) ──>│
     │                                  │                             │
     │ 4. GET /api/images/:id/image     │                             │
     │─────────────────────────────────>│ GetImageUseCase             │
     │                                  │  - อ่าน image_path จาก DB   │
     │                                  │  - ขอ presigned GET URL ───>│
     │  <── { imageUrl } (presigned GET, หมดอายุใน 30 วิ)             │
```

---

### ขั้นตอนที่ 1 — ขอ Presigned Upload URL

`POST /api/uploads/presigned-upload` body: `{ "contentType": "image/jpeg" }`

Flow ใน `GetPresignedUploadUrlUseCase` (`server/modules/images/applications/usecases/get-presigned-upload-url.usecase.ts`):

```ts
// whitelist: แมพอ contentType -> นามสกุลไฟล์
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg', 'image/png': '.png',
  'image/webp': '.webp', 'image/gif': '.gif',
};

// 1. ตรวจ mime type → ไม่อนุญาตจะ throw UnsupportedMediaTypeError
const ext = this.getExtensionFromMimeType(query.contentType);

// 2. สร้าง key เอกลักษณ์ (uuid) => images/<uuid>.jpg
const key = `images/${crypto.randomUUID()}${ext}`;

// 3. ขอ presigned PUT URL จาก R2 (หมดอายุ 5 นาที)
const presignedUrl = await this.blobStorageRepository.getPresignedUploadUrl({
  fullPath: key,
  options: { contentType: query.contentType },
});

// 4. คืน URL ให้ client ไป upload ไฟล์ + key ไว้ยืนยันตอน step 3
return { presignedUrl, key };
```

**จุดที่ควรสังเกต:**
- ใช้ `crypto.randomUUID()` ทำให้ key ไม่ซ้ำกัน ไม่ต้องกลัวไฟล์ทับกัน
- กำหนด `ContentType` ตอนขอ URL → R2 บังคับให้ upload ด้วย mime ที่ถูกต้อง
- ผ่าน `IBlobStorageRepository` (port) → use case ไม่รู้ว่า backend เป็น R2 หรือ S3 ต่อไปจะสลับ provider ก็เปลี่ยนแค่ adapter

### ขั้นตอนที่ 2 — Client Upload ไฟล์ตรงไปที่ R2

- Client ทำ `PUT <presignedUrl>` พร้อม body เป็นไฟล์รูป
- **ไม่ผ่าน backend** → ลดภาระ server, เร็ว, ไม่เปลือง bandwidth ของ server
- เมื่อ upload เสร็จ ไฟล์อยู่ที่ R2 แล้ว แต่ DB ยังไม่รู้

### ขั้นตอนที่ 3 — Confirm Upload (บันทึก key ลง DB)

`POST /api/images/:id/confirm-upload` body: `{ "key": "<key จากขั้นตอน 1>" }`

Flow ใน `ConfirmImageUploadUseCase` (`server/modules/images/applications/usecases/confirm-image-upload.usecase.ts`):

```ts
async execute({ id, newImagePath }: IConfirmImageUploadUsecaseCommand) {
  // 1. เช็คว่ามี record นี้ใน DB ไหม
  const existing = await this.repository.findById(id);
  if (!existing) throw new NotFoundError();

  // 2. บันทึก key ของรูปใหม่ลงตาราง images
  const updated = await this.repository.update(id, { imagePath: newImagePath });

  // 3. ถ้ามีรูปเก่าและไม่ใช่รูปเดียวกัน → ลบรูปเก่าออกจาก R2
  const hasPreviousImage = existing.imagePath && existing.imagePath !== newImagePath;
  if (hasPreviousImage) {
    await this.blobStorageRepository.deleteObject(existing.imagePath as string);
  }

  return updated;
}
```

**จุดที่ควรสังเกต:** ขั้นตอนนี้แยกเป็นคนละ request กับ upload เพราะเป็น **2 ระบบคนละที่** (R2 กับ DB) — upload เสร็จแต่ยังไม่ confirm = ไฟล์ค้างใน bucket เป็น garbage ซึ่งจะถูก cleanup ทีหลัง

### ขั้นตอนที่ 4 — Get รูปภาพ

`GET /api/images/:id/image`

Flow ใน `GetImageUseCase` (`server/modules/images/applications/usecases/get-image.usecase.ts`):

```ts
async execute({ id }: IGetImageUsecaseQuery): Promise<IGetImageUsecaseReturnType> {
  const entity = await this.repository.findById(id);
  if (!entity) throw new NotFoundError();

  // อ่าน key จาก DB แล้วขอ presigned GET URL หมดอายุ 30 วิ
  const imageUrl = entity.imagePath
    ? await this.blobStorageRepository.getPresignedDownloadUrl({
        fullPath: entity.imagePath,
      })
    : null;

  return { imageUrl }; // { imageUrl: null } ถ้ายังไม่เคยอัปรูป
}
```

**จุดที่ควรสังเกต:** ไม่ได้ทำให้ bucket เป็น public — client ได้แค่ URL หมดอายุ 30 วิ เอาไปโหลดรูป → รูปไม่ถูกโหลดไป hotlink ต่อได้นาน ๆ

### ขั้นตอนที่ 2 — Client Upload ไฟล์ตรงไปที่ R2

- Client ทำ `PUT <presignedUrl>` พร้อม body เป็นไฟล์รูป
- **ไม่ผ่าน backend** → ลดภาระ server, เร็ว, ไม่เปลือง bandwidth ของ server
- เมื่อ upload เสร็จ ไฟล์อยู่ที่ R2 แล้ว แต่ DB ยังไม่รู้

### ขั้นตอนที่ 3 — Confirm Upload (บันทึก key ลง DB)

`POST /api/images/:id/confirm-upload` body: `{ "key": "<key จากขั้นตอน 1>" }`

Flow ใน `ConfirmImageUploadUseCase`:
1. `findById(id)` → ถ้าไม่มี record throw `NotFoundError`
2. `update(id, { imagePath: key })` — บันทึก key ลงตาราง `images`
3. ถ้ามีรูปเก่าอยู่ (`existing.imagePath` ต่างจากรูปใหม่) → **ลบรูปเก่าทิ้งจาก R2** ผ่าน `deleteObject()` (กันขยะใน bucket)

### ขั้นตอนที่ 4 — Get รูปภาพ

`GET /api/images/:id/image`

Flow ใน `GetImageUseCase`:
1. `findById(id)` → ถ้าไม่มี throw `NotFoundError`
2. อ่าน `imagePath` จาก DB
3. ถ้ามีค่า → ขอ **presigned GET URL** จาก R2 (หมดอายุ 30 วินาที)
4. Response: `{ imageUrl }` หรือ `{ imageUrl: null }` ถ้ายังไม่เคยอัปรูป

---

## ไฟล์ที่เกี่ยวข้องในโปรเจกต์

| ไฟล์ | บทบาท |
|---|---|
| `server/modules/images/adapters/controllers/image.controller.ts` | กำหนด route: `/uploads/presigned-upload`, `/images/:id/confirm-upload`, `/images/:id/image` |
| `server/modules/images/applications/usecases/get-presigned-upload-url.usecase.ts` | ขั้นตอน 1: ตรวจ mime, สร้าง key, ขอ presigned PUT |
| `server/modules/images/applications/usecases/confirm-image-upload.usecase.ts` | ขั้นตอน 3: บันทึก key ลง DB + ลบรูปเก่า |
| `server/modules/images/applications/usecases/get-image.usecase.ts` | ขั้นตอน 4: อ่าน key จาก DB + ขอ presigned GET |
| `server/modules/images/adapters/repository/image.drizzle.ts` | อ่าน/เขียนตาราง `images` (Drizzle) |
| `server/gateway/blob-storage/adapters/repository/blob-storage.aws.repository.ts` | ตัวติดต่อ R2 จริง: สร้าง presigned URL, ลบ object (S3Client) |
| `server/lib/env.ts` | config R2: accountId, access key, bucket, endpoint |

---

## หัวใจสำคัญ: R2 Adapter (`BlobStorageAwsRepository`)

ไฟล์นี้คือจุดเดียวในโปรเจกต์ที่ "แตะ" Cloudflare R2 จริง ๆ (`server/gateway/blob-storage/adapters/repository/blob-storage.aws.repository.ts`)

```ts
// ใช้ AWS SDK ตัวเดียวกับ S3 เป๊ะ ๆ
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const UPLOAD_URL_EXPIRES_IN_SECONDS = 60 * 5;   // 5 นาที
const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 30;     // 30 วินาที

@injectable()
export class BlobStorageAwsRepository implements IBlobStorageRepository {
  private readonly s3Client: S3Client;

  constructor() {
    // ชี้ endpoint ไปที่ R2 แทน AWS (ดู .env)
    this.s3Client = new S3Client({
      region: r2Env.region,          // 'auto'
      endpoint: r2Env.endpoint,      // https://<accountId>.r2.cloudflarestorage.com
      credentials: r2Env.credentials, // access key + secret
    });
  }

  async getPresignedUploadUrl({ fullPath, options }) {
    const command = new PutObjectCommand({
      Bucket: r2Env.bucketName,
      Key: fullPath,
      ContentType: options?.contentType,
    });
    // สร้าง URL ให้ client PUT ไฟล์ตรงๆ โดยไม่ต้องรู้ secret key
    return getSignedUrl(this.s3Client, command, {
      expiresIn: options?.expiresInSeconds ?? UPLOAD_URL_EXPIRES_IN_SECONDS,
    });
  }

  async getPresignedDownloadUrl({ fullPath, options }) {
    const command = new GetObjectCommand({ Bucket: r2Env.bucketName, Key: fullPath });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds ?? DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    });
  }

  async deleteObject(fullPath: string) {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: r2Env.bucketName, Key: fullPath,
    }));
  }
}
```

**3 สิ่งที่สำคัญที่สุดของตัวนี้:**
1. **`S3Client` ชี้ `endpoint` ไปที่ R2** — เพราะ R2 ใช้ API แบบ S3 ได้เลย แค่เปลี่ยน endpoint ก็คือ "หลอก" AWS SDK ให้ไปทำงานกับ R2 แทน
2. **`getSignedUrl()`** — เปลี่ยน command ให้เป็น URL ที่ฝัง signature ไว้แล้ว client ใช้ได้โดยไม่ต้องรู้ secret key (สำคัญมาก: ห้ามให้ secret หลุดไปที่ frontend)
3. **Config ทั้งหมดจาก `.env`** (`server/lib/env.ts`) — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` — ถ้าเปลี่ยนเป็น S3 จริงก็แก้แค่ env ไม่ต้องแตะโค้ด
