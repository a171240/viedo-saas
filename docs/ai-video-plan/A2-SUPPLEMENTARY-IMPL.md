# 附录 A2: 补充实现

[← 附录 A1](./A1-FILES-AND-ENV.md) | [返回目录](./00-INDEX.md) | [附录 A3 →](./A3-ADVANCED-DOCS.md)

---

> **说明**: 本节补充 Review 中发现的遗漏实现，内部章节统一使用 A2.* 编号。

## A2.1 预签名上传 API

**新建文件**: `apps/nextjs/src/app/api/v1/upload/presign/route.ts`

```typescript
import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { getStorage } from "@videofly/common/storage";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, handleApiError } from "@/app/api/_lib/response";
import { z } from "zod";

const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
});

// 允许的文件类型
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const data = presignSchema.parse(body);

    if (!ALLOWED_TYPES.includes(data.contentType)) {
      throw new Error(`Unsupported file type: ${data.contentType}`);
    }

    // 生成唯一文件路径
    const ext = data.filename.split(".").pop() || "jpg";
    const key = `uploads/${user.id}/${nanoid(12)}.${ext}`;

    const storage = getStorage();
    const uploadUrl = await storage.getSignedUploadUrl({
      key,
      contentType: data.contentType,
      expiresIn: 3600, // 1 小时有效
    });

    // 公开访问 URL
    const publicUrl = process.env.STORAGE_DOMAIN
      ? `${process.env.STORAGE_DOMAIN}/${key}`
      : `https://${process.env.STORAGE_BUCKET}.r2.cloudflarestorage.com/${key}`;

    return apiSuccess({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 3600,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## A2.2 单个视频 API 路由

**新建文件**: `apps/nextjs/src/app/api/v1/video/[uuid]/route.ts`

```typescript
import { NextRequest } from "next/server";
import { videoService } from "@videofly/common/services/video";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/app/api/_lib/response";

// GET /api/v1/video/[uuid] - 获取单个视频详情
export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const user = await requireAuth(request);
    const video = await videoService.getVideo(params.uuid, user.id);

    if (!video) {
      return apiError("Video not found", 404);
    }

    return apiSuccess(video);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/v1/video/[uuid] - 删除视频（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const user = await requireAuth(request);
    const result = await videoService.deleteVideo(params.uuid, user.id);

    if (result.count === 0) {
      return apiError("Video not found", 404);
    }

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## A2.3 过期积分定时任务 (Vercel Cron)

**新建文件**: `apps/nextjs/src/app/api/cron/expire-credits/route.ts`

```typescript
import { NextRequest } from "next/server";
import { creditService } from "@videofly/common/services/credit";
import { apiSuccess, apiError } from "@/app/api/_lib/response";

/**
 * Vercel Cron Job: 每天凌晨 2 点执行
 * 配置: vercel.json 或 Vercel Dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // 验证 Cron 密钥（防止外部调用）
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return apiError("Unauthorized", 401);
    }

    // 执行过期处理
    const expiredCount = await creditService.expireCredits();

    console.log(`[Cron] Expired ${expiredCount} credit packages`);

    return apiSuccess({
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Expire credits failed:", error);
    return apiError("Cron job failed", 500);
  }
}
```

**配置文件**: `apps/nextjs/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-credits",
      "schedule": "0 2 * * *"
    }
  ]
}
```

## A2.4 修复 CreditHold Schema

**修改文件**: `packages/db/prisma/schema.prisma`

将原来的：
```prisma
model CreditHold {
  // ...
  packages        CreditPackage[]  // 错误：未定义的多对多关系
}
```

修改为：
```prisma
// 积分冻结记录 - 任务进行中的积分锁定
model CreditHold {
  id              Int                   @id @default(autoincrement())

  userId          String                @map("user_id")
  videoUuid       String                @unique @map("video_uuid") // 唯一约束，防止重复冻结

  // 冻结信息
  credits         Int                   // 冻结积分数
  status          String                @default("HOLDING") // HOLDING, SETTLED, RELEASED

  // 关联的积分包分配（JSON 记录从哪些包扣除）
  // 格式: [{packageId: number, credits: number}]
  packageAllocation Json               @map("package_allocation")

  // 时间戳
  createdAt       DateTime              @default(now()) @map("created_at")
  settledAt       DateTime?             @map("settled_at")

  // 关联
  user            BetterAuthUser        @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
  @@map("credit_holds")
}
```

> **变更说明**: 移除了错误的 `packages CreditPackage[]` 关系，实际的包分配通过 `packageAllocation` JSON 字段追踪。

## A2.5 Creem onGrantAccess 幂等性保护

**修改文件**: `packages/auth/index.ts` (Creem 插件配置部分)

```typescript
import { betterAuth } from "better-auth";
import { creem } from "@creem_io/better-auth";
import { creditService } from "@videofly/common/services/credit";
import { CreditTransType } from "@prisma/client";
import { getProductById, getProductExpiryDays } from "@videofly/common/config/credits";
import { db } from "@videofly/db";

export const auth = betterAuth({
  // ...existing config...
  plugins: [
    // ...existing plugins...
    creem({
      apiKey: process.env.CREEM_API_KEY!,
      webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
      testMode: process.env.NODE_ENV !== "production",
      persistSubscriptions: true,

      onGrantAccess: async ({ customer, product, metadata, isRenewal }) => {
        console.log("Creem access granted:", { customer, product, isRenewal, metadata });

        const productConfig = getProductById(product.id);
        if (!productConfig) {
          console.error(`Unknown product: ${product.id}`);
          return;
        }

        const credits = productConfig.credits;
        if (credits <= 0) return;

        // ========================================
        // 幂等性保护：使用 Creem 支付/订阅 ID 作为唯一标识
        // ========================================
        const paymentId = metadata?.paymentId || metadata?.subscriptionId;
        const orderNo = paymentId
          ? `creem_${paymentId}`
          : `creem_${productConfig.type}_${customer.userId}_${Date.now()}`;

        // 检查是否已处理过此支付
        const existingPackage = await db.creditPackage.findFirst({
          where: { orderNo },
        });

        if (existingPackage) {
          console.log(`[Creem] Duplicate webhook ignored: ${orderNo}`);
          return; // 幂等：已处理过，直接返回
        }

        // 确定交易类型
        const transType = productConfig.type === "subscription"
          ? CreditTransType.SUBSCRIPTION
          : CreditTransType.ORDER_PAY;

        // 充值积分（创建积分包）
        await creditService.recharge({
          userId: customer.userId,
          credits,
          orderNo,
          transType,
          expiryDays: getProductExpiryDays(productConfig),
          remark: isRenewal
            ? `Subscription renewal: ${productConfig.id}`
            : `Payment: ${productConfig.id}`,
        });

        console.log(`[Creem] Credited ${credits} to user ${customer.userId}, orderNo=${orderNo}`);
      },

      onRevokeAccess: async ({ customer, product, metadata }) => {
        console.log("Creem access revoked:", { customer, product });
        // 订阅取消后，已发放的积分仍可使用至过期
      },
    }),
  ],
});
```

## A2.6 VideoStatusCard 组件

**新建文件**: `apps/nextjs/src/components/video-generator/video-status-card.tsx`

```tsx
"use client";

import { Card, CardContent } from "@videofly/ui/card";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@videofly/ui";

interface VideoStatusCardProps {
  status: string;
  videoUrl?: string;
  error?: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  PENDING: {
    icon: Clock,
    label: "Waiting to start...",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  GENERATING: {
    icon: Loader2,
    label: "Generating video...",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  UPLOADING: {
    icon: Loader2,
    label: "Uploading to storage...",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  COMPLETED: {
    icon: CheckCircle,
    label: "Video ready!",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  FAILED: {
    icon: XCircle,
    label: "Generation failed",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
};

export function VideoStatusCard({
  status,
  videoUrl,
  error,
  className,
}: VideoStatusCardProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  const isLoading = ["PENDING", "GENERATING", "UPLOADING"].includes(status);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        {/* Status Header */}
        <div className={cn("flex items-center gap-3 p-4 rounded-lg mb-4", config.bgColor)}>
          <Icon
            className={cn(
              "w-6 h-6",
              config.color,
              isLoading && "animate-spin"
            )}
          />
          <span className={cn("font-medium", config.color)}>
            {config.label}
          </span>
        </div>

        {/* Video Preview */}
        {status === "COMPLETED" && videoUrl && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              src={videoUrl}
              controls
              className="w-full aspect-video"
              poster={videoUrl.replace(".mp4", "_thumb.jpg")}
            />
          </div>
        )}

        {/* Error Message */}
        {status === "FAILED" && error && (
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading Progress Hint */}
        {isLoading && (
          <div className="text-center text-muted-foreground text-sm">
            <p>This may take 1-3 minutes depending on video length.</p>
            <p className="mt-1">You can leave this page - we'll save your video.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## A2.7 VideoCard 组件

**新建文件**: `apps/nextjs/src/components/video-generator/video-card.tsx`

```tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@videofly/ui/card";
import { Button } from "@videofly/ui/button";
import { Badge } from "@videofly/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@videofly/ui/dropdown-menu";
import { MoreVertical, Play, Download, Trash2, Copy, ExternalLink } from "lucide-react";
import { cn } from "@videofly/ui";
import { toast } from "sonner";

interface Video {
  uuid: string;
  prompt: string;
  model: string;
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  creditsUsed: number;
  duration?: number;
}

interface VideoCardProps {
  video: Video;
  onDelete?: () => void;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  GENERATING: { label: "Generating", variant: "secondary" },
  UPLOADING: { label: "Uploading", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const statusInfo = STATUS_BADGE[video.status] || STATUS_BADGE.PENDING;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(video.prompt);
    toast.success("Prompt copied to clipboard");
  };

  const handleDownload = () => {
    if (video.videoUrl) {
      const a = document.createElement("a");
      a.href = video.videoUrl;
      a.download = `video-${video.uuid}.mp4`;
      a.click();
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this video?")) {
      onDelete?.();
    }
  };

  return (
    <Card className="overflow-hidden group">
      {/* Video Preview / Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {video.status === "COMPLETED" && video.videoUrl ? (
          isPlaying ? (
            <video
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-cover"
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <>
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.prompt}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <Play className="w-12 h-12 text-white/50" />
                </div>
              )}
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-8 h-8 text-gray-900 ml-1" />
                </div>
              </button>
            </>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {video.status === "FAILED" ? (
              <span className="text-destructive">Failed</span>
            ) : (
              <div className="animate-pulse text-muted-foreground">
                Processing...
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        <Badge
          variant={statusInfo.variant}
          className="absolute top-2 right-2"
        >
          {statusInfo.label}
        </Badge>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <p className="text-sm line-clamp-2 mb-2" title={video.prompt}>
          {video.prompt}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{video.model}</span>
          <span>•</span>
          <span>{video.creditsUsed} credits</span>
          {video.duration && (
            <>
              <span>•</span>
              <span>{video.duration}s</span>
            </>
          )}
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="p-4 pt-0 flex justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(video.createdAt).toLocaleDateString()}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyPrompt}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Prompt
            </DropdownMenuItem>
            {video.videoUrl && (
              <>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </a>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
```

## A2.8 API 限流中间件

**新建文件**: `apps/nextjs/src/app/api/_lib/rate-limit.ts`

```typescript
import { LRUCache } from "lru-cache";

interface RateLimitOptions {
  interval: number;    // 时间窗口（毫秒）
  uniqueTokenPerInterval: number;  // 缓存的最大 token 数
  limit: number;       // 每个 token 在时间窗口内的最大请求数
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const cache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (token: string): RateLimitResult => {
      const now = Date.now();
      const windowStart = now - options.interval;

      // 获取该 token 的请求记录
      const timestamps = cache.get(token) || [];

      // 过滤掉过期的请求
      const validTimestamps = timestamps.filter((ts) => ts > windowStart);

      // 检查是否超过限制
      if (validTimestamps.length >= options.limit) {
        const oldestTimestamp = validTimestamps[0] || now;
        return {
          success: false,
          limit: options.limit,
          remaining: 0,
          reset: oldestTimestamp + options.interval,
        };
      }

      // 添加当前请求
      validTimestamps.push(now);
      cache.set(token, validTimestamps);

      return {
        success: true,
        limit: options.limit,
        remaining: options.limit - validTimestamps.length,
        reset: now + options.interval,
      };
    },
  };
}

// 预配置的限流器

// 视频生成 API: 每分钟 5 次
export const videoGenerationLimiter = createRateLimiter({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  limit: 5,
});

// 通用 API: 每分钟 60 次
export const generalApiLimiter = createRateLimiter({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  limit: 60,
});

// IP 级别限流: 每分钟 100 次
export const ipLimiter = createRateLimiter({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 1000,
  limit: 100,
});
```

**应用限流到视频生成 API**:

```typescript
// apps/nextjs/src/app/api/v1/video/generate/route.ts (更新版)
import { NextRequest } from "next/server";
import { videoService } from "@videofly/common/services/video";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, apiError, handleApiError } from "@/app/api/_lib/response";
import { videoGenerationLimiter, ipLimiter } from "@/app/api/_lib/rate-limit";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(1).max(5000),
  model: z.enum(["sora-2", "sora-2-pro"]),
  duration: z.union([z.literal(10), z.literal(15)]),
  aspectRatio: z.enum(["16:9", "9:16"]).optional(),
  quality: z.enum(["standard", "high"]).optional(),
  imageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // IP 级别限流
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const ipCheck = ipLimiter.check(ip);
    if (!ipCheck.success) {
      return apiError("Too many requests from this IP", 429);
    }

    const user = await requireAuth(request);

    // 用户级别限流
    const userCheck = videoGenerationLimiter.check(user.id);
    if (!userCheck.success) {
      return apiError(
        `Rate limit exceeded. You can generate ${userCheck.limit} videos per minute.`,
        429,
        {
          limit: userCheck.limit,
          remaining: userCheck.remaining,
          resetAt: new Date(userCheck.reset).toISOString(),
        }
      );
    }

    const body = await request.json();
    const data = generateSchema.parse(body);

    const result = await videoService.generate({
      userId: user.id,
      prompt: data.prompt,
      model: data.model,
      duration: data.duration,
      aspectRatio: data.aspectRatio,
      quality: data.quality,
      imageUrl: data.imageUrl,
    });

    // 添加限流信息到响应头（可选）
    const response = apiSuccess(result);
    response.headers.set("X-RateLimit-Limit", String(userCheck.limit));
    response.headers.set("X-RateLimit-Remaining", String(userCheck.remaining));
    response.headers.set("X-RateLimit-Reset", String(userCheck.reset));

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

## A2.9 新增依赖

```json
{
  "lru-cache": "^10.x",
  "zustand": "^5.x"
}
```

> **说明**: Zustand 用于客户端积分状态管理（见 Phase 3 - 3.7）。

---

[← 附录 A1](./A1-FILES-AND-ENV.md) | [返回目录](./00-INDEX.md) | [附录 A3 →](./A3-ADVANCED-DOCS.md)
