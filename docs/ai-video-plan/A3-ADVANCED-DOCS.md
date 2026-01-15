# 附录 A3: 进阶文档

[← 附录 A2](./A2-SUPPLEMENTARY-IMPL.md) | [返回目录](./00-INDEX.md) | [更新日志 →](./CHANGELOG.md)

---

## A3.1 Creem 支付进阶文档

> **说明**: 本节补充 Creem 支付集成的进阶内容，包括 Webhook 处理、退款、订阅变更等，内部章节统一使用 A3.* 编号。

### A3.1.1 Webhook 处理机制

Better Auth Creem 插件**自动处理** Webhook，无需手动创建路由。

#### Webhook 自动路由

```text
# Better Auth Creem 插件会自动在以下路径处理 Webhook：
POST /api/auth/creem/webhook
```

#### Creem Dashboard 配置

在 Creem Dashboard 中配置 Webhook URL：

```text
Webhook URL: https://yourdomain.com/api/auth/creem/webhook
Events: payment.completed, subscription.created, subscription.cancelled, subscription.renewed
```

#### 手动 Webhook 路由（可选）

如果需要自定义处理逻辑，可以创建显式路由：

**新建文件**: `apps/nextjs/src/app/api/webhooks/creem/route.ts`

```typescript
import { NextRequest } from "next/server";
import { auth } from "@videofly/auth";
import { apiSuccess, apiError } from "@/app/api/_lib/response";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 获取签名
    const signature = request.headers.get("x-creem-signature");
    const body = await request.text();

    // 验证签名
    if (!verifyCreemSignature(body, signature)) {
      return apiError("Invalid signature", 401);
    }

    const event = JSON.parse(body);

    // 委托给 Better Auth 处理
    // 或者在这里添加自定义逻辑
    switch (event.type) {
      case "payment.completed":
        // 自定义支付完成逻辑
        console.log("[Creem Webhook] Payment completed:", event.data);
        break;
      case "subscription.cancelled":
        // 自定义取消逻辑
        console.log("[Creem Webhook] Subscription cancelled:", event.data);
        break;
      case "refund.completed":
        // 处理退款
        await handleRefund(event.data);
        break;
    }

    return apiSuccess({ received: true });
  } catch (error) {
    console.error("[Creem Webhook] Error:", error);
    return apiError("Webhook processing failed", 500);
  }
}

function verifyCreemSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.CREEM_WEBHOOK_SECRET) return false;

  const expectedSig = crypto
    .createHmac("sha256", process.env.CREEM_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature.length !== expectedSig.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

async function handleRefund(data: any) {
  // 退款处理逻辑见 A3.1.2
}
```

### A3.1.2 退款处理

当用户申请退款时，需要扣回已发放的积分。

**修改文件**: `packages/common/src/services/credit.ts` (添加方法)

```typescript
/**
 * 退款扣回积分
 *
 * 策略：
 * 1. 如果用户剩余积分 >= 退款积分，直接扣除
 * 2. 如果用户剩余积分 < 退款积分，扣除全部剩余积分，记录欠款
 */
async refundDeduct(params: {
  userId: string;
  credits: number;
  orderNo: string;
  reason?: string;
}): Promise<{ deducted: number; shortfall: number }> {
  const { userId, credits, orderNo, reason } = params;

  return db.$transaction(async (tx) => {
    // 获取用户所有有效积分包
    const packages = await tx.creditPackage.findMany({
      where: {
        userId,
        status: CreditPackageStatus.ACTIVE,
        remainingCredits: { gt: 0 },
      },
      orderBy: { createdAt: "desc" }, // 后进先出，扣最新的
    });

    const availableCredits = packages.reduce((sum, p) => sum + p.remainingCredits, 0);
    const toDeduct = Math.min(credits, availableCredits);
    const shortfall = credits - toDeduct;

    let remaining = toDeduct;
    for (const pkg of packages) {
      if (remaining <= 0) break;

      const deductFromPkg = Math.min(pkg.remainingCredits, remaining);
      await tx.creditPackage.update({
        where: { id: pkg.id },
        data: { remainingCredits: { decrement: deductFromPkg } },
      });
      remaining -= deductFromPkg;
    }

    // 记录流水
    const balance = await this.getBalanceInTx(tx, userId);
    await tx.creditTransaction.create({
      data: {
        transNo: `TXN${Date.now()}${nanoid(6)}`,
        userId,
        transType: CreditTransType.REFUND,
        credits: -toDeduct,
        balanceAfter: balance.availableCredits,
        orderNo,
        remark: reason || `Refund deduction for order: ${orderNo}`,
      },
    });

    if (shortfall > 0) {
      console.warn(`[Credit] Refund shortfall: user ${userId} owes ${shortfall} credits`);
      // 可选：记录欠款到单独的表
    }

    return { deducted: toDeduct, shortfall };
  });
}
```

### A3.1.3 订阅升级/降级

当用户从 Basic 升级到 Pro，或从 Pro 降级到 Basic 时的处理。

```typescript
// Creem 插件的 onGrantAccess 会在订阅变更时触发
// 升级：立即发放新等级的积分差额（或等下个周期）
// 降级：当前周期积分不变，下个周期生效

// 策略选择（在 credits.ts 中配置）：
export const UPGRADE_POLICY = {
  // "immediate" - 立即补发差额
  // "next_cycle" - 下个周期生效
  mode: "next_cycle" as const,
};
```

### A3.1.4 测试模式

开发环境使用 Creem 测试模式：

```typescript
// packages/auth/index.ts
creem({
  apiKey: process.env.CREEM_API_KEY!,
  testMode: process.env.NODE_ENV !== "production", // 开发环境自动启用
  // ...
})
```

**测试卡号**:

| 卡号 | 说明 |
|------|------|
| 4242 4242 4242 4242 | 成功支付 |
| 4000 0000 0000 0002 | 卡被拒绝 |
| 4000 0000 0000 9995 | 余额不足 |

---

## A3.2 视频 API 进阶文档

> **说明**: 本节补充视频生成 API 的进阶内容，包括重试、清理、并发限制等。

### A3.2.1 失败视频重试机制

当 R2 上传失败时，允许用户手动重试。

**新建文件**: `apps/nextjs/src/app/api/v1/video/[uuid]/retry/route.ts`

```typescript
import { NextRequest } from "next/server";
import { db } from "@videofly/db";
import { VideoStatus } from "@prisma/client";
import { getStorage } from "@videofly/common/storage";
import { creditService } from "@videofly/common/services/credit";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/app/api/_lib/response";

/**
 * POST /api/v1/video/[uuid]/retry
 *
 * 重试失败的视频上传
 * 仅当视频状态为 FAILED 且 originalVideoUrl 存在时可用
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const user = await requireAuth(request);

    const video = await db.video.findFirst({
      where: { uuid: params.uuid, userId: user.id },
    });

    if (!video) {
      return apiError("Video not found", 404);
    }

    if (video.status !== VideoStatus.FAILED) {
      return apiError("Only failed videos can be retried", 400);
    }

    if (!video.originalVideoUrl) {
      return apiError("Original video URL not available. Please regenerate.", 400);
    }

    // 检查原始 URL 是否仍然有效（通常 24 小时）
    const urlCheck = await fetch(video.originalVideoUrl, { method: "HEAD" });
    if (!urlCheck.ok) {
      return apiError("Original video URL has expired. Please regenerate.", 410);
    }

    // 更新状态为上传中
    await db.video.update({
      where: { uuid: params.uuid },
      data: { status: VideoStatus.UPLOADING },
    });

    try {
      // 重新上传到 R2
      const storage = getStorage();
      const key = `videos/${params.uuid}/${Date.now()}.mp4`;
      const uploaded = await storage.downloadAndUpload({
        sourceUrl: video.originalVideoUrl,
        key,
        contentType: "video/mp4",
      });

      // 结算积分（如果之前未结算）
      try {
        await creditService.settle(params.uuid);
      } catch (e) {
        // 可能已结算，忽略
      }

      // 更新为完成
      await db.video.update({
        where: { uuid: params.uuid },
        data: {
          status: VideoStatus.COMPLETED,
          videoUrl: uploaded.url,
          completedAt: new Date(),
          errorMessage: null,
        },
      });

      return apiSuccess({ status: "COMPLETED", videoUrl: uploaded.url });
    } catch (uploadError) {
      // 上传再次失败
      await db.video.update({
        where: { uuid: params.uuid },
        data: {
          status: VideoStatus.FAILED,
          errorMessage: `Retry failed: ${uploadError}`,
        },
      });

      return apiError("Retry upload failed", 500);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
```

### A3.2.2 视频清理策略

失败和过期视频的清理机制。

**新建文件**: `apps/nextjs/src/app/api/cron/cleanup-videos/route.ts`

```typescript
import { NextRequest } from "next/server";
import { db } from "@videofly/db";
import { VideoStatus } from "@prisma/client";
import { apiSuccess, apiError } from "@/app/api/_lib/response";

/**
 * Vercel Cron: 每周执行一次
 * 清理策略：
 * 1. 删除 30 天前的 FAILED 视频记录
 * 2. 标记 90 天前的 COMPLETED 视频为 archived
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError("Unauthorized", 401);
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // 1. 硬删除 30 天前的失败视频
  const deletedFailed = await db.video.deleteMany({
    where: {
      status: VideoStatus.FAILED,
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  // 2. 软删除 90 天前的完成视频（保留记录，标记为已删除）
  const archivedCompleted = await db.video.updateMany({
    where: {
      status: VideoStatus.COMPLETED,
      createdAt: { lt: ninetyDaysAgo },
      isDeleted: false,
    },
    data: { isDeleted: true },
  });

  console.log(`[Cron] Cleaned up videos: ${deletedFailed.count} failed, ${archivedCompleted.count} archived`);

  return apiSuccess({
    deletedFailed: deletedFailed.count,
    archivedCompleted: archivedCompleted.count,
  });
}
```

**更新 vercel.json**:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-credits",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup-videos",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

### A3.2.3 并发生成限制

限制用户同时进行的视频生成数量。

**修改文件**: `packages/common/src/services/video.ts` (generate 方法开头添加)

```typescript
// 在 generate() 方法开头添加并发检查
async generate(params: GenerateVideoParams): Promise<VideoGenerationResult> {
  // 并发限制检查
  const MAX_CONCURRENT = 3; // 每用户最多 3 个进行中的任务

  const inProgressCount = await db.video.count({
    where: {
      userId: params.userId,
      status: { in: [VideoStatus.PENDING, VideoStatus.GENERATING, VideoStatus.UPLOADING] },
    },
  });

  if (inProgressCount >= MAX_CONCURRENT) {
    throw new Error(
      `Maximum concurrent generations reached (${MAX_CONCURRENT}). Please wait for current tasks to complete.`
    );
  }

  // ... 原有逻辑
}
```

### A3.2.4 统一错误码

**新建文件**: `packages/common/src/errors/video-errors.ts`

```typescript
export const VIDEO_ERROR_CODES = {
  // 客户端错误 (4xx)
  INSUFFICIENT_CREDITS: { code: "E4001", message: "Insufficient credits", status: 402 },
  MODEL_NOT_FOUND: { code: "E4002", message: "Model not found", status: 400 },
  INVALID_DURATION: { code: "E4003", message: "Invalid duration", status: 400 },
  IMAGE_UPLOAD_REQUIRED: { code: "E4004", message: "Image upload required for this model", status: 400 },
  MAX_CONCURRENT_REACHED: { code: "E4005", message: "Maximum concurrent generations reached", status: 429 },
  VIDEO_NOT_FOUND: { code: "E4006", message: "Video not found", status: 404 },
  RETRY_NOT_AVAILABLE: { code: "E4007", message: "Retry not available for this video", status: 400 },
  ORIGINAL_URL_EXPIRED: { code: "E4008", message: "Original video URL has expired", status: 410 },

  // 服务端错误 (5xx)
  AI_PROVIDER_ERROR: { code: "E5001", message: "AI provider error", status: 502 },
  STORAGE_UPLOAD_FAILED: { code: "E5002", message: "Storage upload failed", status: 500 },
  CALLBACK_PROCESSING_FAILED: { code: "E5003", message: "Callback processing failed", status: 500 },
} as const;

export type VideoErrorCode = keyof typeof VIDEO_ERROR_CODES;

export class VideoError extends Error {
  code: string;
  status: number;

  constructor(errorCode: VideoErrorCode, details?: string) {
    const errorInfo = VIDEO_ERROR_CODES[errorCode];
    super(details ? `${errorInfo.message}: ${details}` : errorInfo.message);
    this.code = errorInfo.code;
    this.status = errorInfo.status;
  }
}
```

---

## A3.3 设计决策与开放问题

> **说明**: 本节记录关键设计决策和已解决的开放问题。

### A3.3.1 失败视频记录保留策略

**决策**: 保留失败视频记录用于审计和重试

**理由**:
1. **用户体验**: 用户可以看到失败历史，了解发生了什么
2. **重试支持**: 如果 `originalVideoUrl` 仍有效（24小时内），可以重试上传
3. **审计需求**: 失败记录有助于分析系统问题
4. **积分追踪**: 失败视频关联的积分释放需要记录关联

**清理策略**:
- 30 天后自动删除失败记录（通过 Cron 任务）
- 用户可手动删除（软删除）

### A3.3.2 Creem Webhook 处理方式

**决策**: 主要委托给 Better Auth 插件，可选显式路由

**理由**:
1. **简化集成**: Better Auth Creem 插件已处理签名验证、事件路由
2. **回调机制**: `onGrantAccess` / `onRevokeAccess` 提供足够的钩子
3. **可扩展性**: 如需自定义（如退款），可添加显式 Webhook 路由

**实现**:
- 默认使用插件的 `/api/auth/creem/webhook`
- 退款等特殊场景使用 `/api/webhooks/creem`（可选）

### A3.3.3 积分冻结与过期的交互

**决策**: 冻结中的积分包不会被过期处理

**理由**:
1. **任务保障**: 用户已发起任务，不应因过期导致失败
2. **数据一致性**: 冻结记录与积分包的关联不应被打断
3. **安全释放**: 任务完成/失败时，积分会正确结算/释放

**实现**:
```typescript
// expireCredits() 中的条件
frozenCredits: 0, // 仅过期没有冻结的包
```

### A3.3.4 视频并发限制策略

**决策**: 每用户最多 3 个同时进行的视频生成

**理由**:
1. **资源控制**: 防止单用户占用过多 AI 资源
2. **成本控制**: 限制并发避免意外高额 API 调用
3. **用户体验**: 3 个并发对普通用户足够

**可配置性**:
```typescript
// 可通过环境变量配置
const MAX_CONCURRENT = parseInt(process.env.VIDEO_MAX_CONCURRENT || "3");
```

### A3.3.5 API 路由版本策略

**决策**: 使用 `/api/v1/` 前缀

**理由**:
1. **向后兼容**: 未来 v2 API 可以并存
2. **渐进迁移**: 客户端可按需迁移到新版本
3. **文档清晰**: 版本化 API 更易于文档化

---

## A3.4 新增文件清单

```text
# A3.1 - Creem Webhook（可选）
apps/nextjs/src/app/api/webhooks/creem/route.ts

# A3.2 - 视频重试
apps/nextjs/src/app/api/v1/video/[uuid]/retry/route.ts

# A3.3 - 视频清理
apps/nextjs/src/app/api/cron/cleanup-videos/route.ts

# A3.4 - 错误码定义
packages/common/src/errors/video-errors.ts
```

---

[← 附录 A2](./A2-SUPPLEMENTARY-IMPL.md) | [返回目录](./00-INDEX.md) | [更新日志 →](./CHANGELOG.md)
