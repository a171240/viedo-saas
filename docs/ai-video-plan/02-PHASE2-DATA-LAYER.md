# Phase 2: 数据层扩展

[← 上一阶段](./01-PHASE1-INFRASTRUCTURE.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./03-PHASE3-CREDITS.md)

---

## 2.1 目标

- 扩展 Prisma Schema，添加 Video 相关表（积分 Schema 见 Phase 3）
- 集成 R2/S3 文件存储
- 建立数据访问层

## 2.2 详细任务

### 2.2.1 数据库 Schema 扩展

**修改文件**: `packages/db/prisma/schema.prisma`

```prisma
// ============================================
// Video Generation
// ============================================

enum VideoStatus {
  PENDING      // 待处理
  GENERATING   // 生成中
  UPLOADING    // 上传中
  COMPLETED    // 已完成
  FAILED       // 失败
}

model Video {
  id                    Int         @id @default(autoincrement())
  uuid                  String      @unique @default(uuid())
  userId                String      @map("user_id")

  // 生成参数
  prompt                String      @db.Text
  model                 String      // 模型ID: sora-2, sora-2-pro 等
  parameters            Json?       // 模型参数 JSON

  // 状态追踪
  status                VideoStatus @default(PENDING)
  provider              String?     // evolink, kie
  externalTaskId        String?     @map("external_task_id")  // AI 服务的任务 ID
  errorMessage          String?     @map("error_message") @db.Text

  // 文件信息
  startImageUrl         String?     @map("start_image_url")
  originalVideoUrl      String?     @map("original_video_url")  // AI 返回的原始 URL
  videoUrl              String?     @map("video_url")           // R2 存储的 URL
  thumbnailUrl          String?     @map("thumbnail_url")       // 首帧缩略图

  // 视频元数据
  duration              Int?        // 时长（秒）
  resolution            String?     // 分辨率 720p, 1080p 等
  aspectRatio           String?     @map("aspect_ratio")        // 16:9, 9:16 等
  fileSize              Int?        @map("file_size")           // 文件大小（字节）

  // 积分
  creditsUsed           Int         @default(0) @map("credits_used")

  // 时间戳
  createdAt             DateTime    @default(now()) @map("created_at")
  updatedAt             DateTime    @updatedAt @map("updated_at")
  completedAt           DateTime?   @map("completed_at")
  generationTime        Int?        @map("generation_time")     // 生成耗时（秒）

  // 软删除
  isDeleted             Boolean     @default(false) @map("is_deleted")

  // 关联
  user                  BetterAuthUser @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("videos")
}

// 更新 BetterAuthUser，添加关联
model BetterAuthUser {
  // ... 现有字段 ...

  // 新增关联 (Phase 2 - Video)
  videos              Video[]

  // 新增关联 (Phase 3 - Credits)
  creditPackages      CreditPackage[]
  creditHolds         CreditHold[]
  creditTransactions  CreditTransaction[]
}
```

> **说明**: 积分系统采用“积分包 + 冻结/结算/退回”模型，完整 Schema 在 Phase 3 说明。
> 模型配置已统一到 Phase 3 的 `packages/common/src/config/credits.ts`，不再使用数据库表。

### 2.2.2 R2 存储集成

**新建文件**: `packages/common/src/storage.ts`

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
}

export class Storage {
  private client: S3Client;
  private bucket: string;
  private publicDomain?: string;

  constructor(config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.publicDomain = config.publicDomain;
  }

  async uploadFile(params: {
    key: string;
    body: Buffer | Uint8Array;
    contentType?: string;
  }): Promise<{ url: string; key: string }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType || "application/octet-stream",
      })
    );

    const url = this.publicDomain
      ? `${this.publicDomain}/${params.key}`
      : `https://${this.bucket}.r2.cloudflarestorage.com/${params.key}`;

    return { url, key: params.key };
  }

  async downloadAndUpload(params: {
    sourceUrl: string;
    key: string;
    contentType?: string;
  }): Promise<{ url: string; key: string }> {
    const response = await fetch(params.sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = params.contentType || response.headers.get("content-type") || "video/mp4";

    return this.uploadFile({
      key: params.key,
      body: buffer,
      contentType,
    });
  }

  async getSignedUploadUrl(params: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: params.expiresIn || 3600,
    });
  }
}

// 单例工厂
let storageInstance: Storage | null = null;

export function getStorage(): Storage {
  if (!storageInstance) {
    storageInstance = new Storage({
      endpoint: process.env.STORAGE_ENDPOINT!,
      region: process.env.STORAGE_REGION || "auto",
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      bucket: process.env.STORAGE_BUCKET!,
      publicDomain: process.env.STORAGE_DOMAIN,
    });
  }
  return storageInstance;
}
```

### 2.2.3 环境变量更新

**更新文件**: `.env.example`

```bash
# ============================================
# R2/S3 Storage
# ============================================
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=your_access_key
STORAGE_SECRET_KEY=your_secret_key
STORAGE_BUCKET=your_bucket_name
STORAGE_DOMAIN=https://cdn.yourdomain.com

# ============================================
# AI Video Providers
# ============================================
EVOLINK_API_KEY=your_evolink_api_key
KIE_API_KEY=your_kie_api_key
DEFAULT_AI_PROVIDER=evolink

# ============================================
# AI Callback (生产环境必须配置)
# ============================================
AI_CALLBACK_URL=https://yourdomain.com/api/v1/video/callback
CALLBACK_HMAC_SECRET=your_callback_secret_for_hmac
```

## 2.3 验收标准

- [ ] `pnpm db:push` 成功执行
- [ ] Video、Credit 表创建成功
- [ ] Storage 类能成功上传测试文件
- [ ] 环境变量配置完整

## 2.4 新增依赖

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x"
}
```

---

[← 上一阶段](./01-PHASE1-INFRASTRUCTURE.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./03-PHASE3-CREDITS.md)
