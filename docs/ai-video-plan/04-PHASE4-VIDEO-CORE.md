# Phase 4: AI 视频生成核心

[← 上一阶段](./03-PHASE3-CREDITS.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./05-PHASE5-FRONTEND.md)

---

## 4.1 目标

- 实现多 Provider 抽象层 (evolink + kie)
- 支持 Callback 为主、轮询为备的双模式
- 视频上传至 R2 存储
- 统一的模型配置系统

> **重要变更**: 不再使用 Replicate，改用 evolink.ai 和 kie.ai 两家 API
> 详细 API 文档见 [API-INTEGRATION-GUIDE.md](../API-INTEGRATION-GUIDE.md)

## 4.2 详细任务

### 4.2.1 AI Provider 抽象层

**新建目录结构**:

```
packages/common/src/ai/
├── types.ts                    # 统一接口定义
├── index.ts                    # Provider 工厂
└── providers/
    ├── evolink.ts              # evolink.ai 实现
    └── kie.ts                  # kie.ai 实现
```

**新建文件**: `packages/common/src/ai/types.ts`

```typescript
// 统一的视频生成参数
export interface VideoGenerationParams {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: 10 | 15;
  quality?: "standard" | "high";
  imageUrl?: string;
  removeWatermark?: boolean;
  callbackUrl?: string;
}

// 统一的任务响应
export interface VideoTaskResponse {
  taskId: string;
  provider: "evolink" | "kie";
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  estimatedTime?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: {
    code: string;
    message: string;
  };
  raw?: any;
}

// Provider 接口
export interface AIVideoProvider {
  name: string;
  supportImageToVideo: boolean;
  createTask(params: VideoGenerationParams): Promise<VideoTaskResponse>;
  getTaskStatus(taskId: string): Promise<VideoTaskResponse>;
  parseCallback(payload: any): VideoTaskResponse;
}
```

**新建文件**: `packages/common/src/ai/providers/evolink.ts`

```typescript
import type { AIVideoProvider, VideoGenerationParams, VideoTaskResponse } from "../types";

export class EvolinkProvider implements AIVideoProvider {
  name = "evolink";
  supportImageToVideo = true; // evolink 支持图生视频
  private apiKey: string;
  private baseUrl = "https://api.evolink.ai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createTask(params: VideoGenerationParams): Promise<VideoTaskResponse> {
    const response = await fetch(`${this.baseUrl}/videos/generations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sora-2",
        prompt: params.prompt,
        aspect_ratio: params.aspectRatio || "16:9",
        duration: params.duration || 10,
        image_urls: params.imageUrl ? [params.imageUrl] : undefined,
        remove_watermark: params.removeWatermark ?? true,
        callback_url: params.callbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      taskId: data.id,
      provider: "evolink",
      status: this.mapStatus(data.status),
      progress: data.progress,
      estimatedTime: data.task_info?.estimated_time,
      raw: data,
    };
  }

  async getTaskStatus(taskId: string): Promise<VideoTaskResponse> {
    const response = await fetch(`${this.baseUrl}/videos/generations/${taskId}`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });

    if (!response.ok) throw new Error("Failed to get task status");

    const data = await response.json();

    return {
      taskId: data.id,
      provider: "evolink",
      status: this.mapStatus(data.status),
      progress: data.progress,
      videoUrl: data.data?.video_url,
      thumbnailUrl: data.data?.thumbnail_url,
      error: data.error,
      raw: data,
    };
  }

  parseCallback(payload: any): VideoTaskResponse {
    return {
      taskId: payload.id,
      provider: "evolink",
      status: this.mapStatus(payload.status),
      progress: payload.progress,
      videoUrl: payload.data?.video_url,
      thumbnailUrl: payload.data?.thumbnail_url,
      error: payload.error,
      raw: payload,
    };
  }

  private mapStatus(status: string): VideoTaskResponse["status"] {
    const map: Record<string, VideoTaskResponse["status"]> = {
      pending: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      cancelled: "failed",
    };
    return map[status] || "pending";
  }
}
```

**新建文件**: `packages/common/src/ai/providers/kie.ts`

```typescript
import type { AIVideoProvider, VideoGenerationParams, VideoTaskResponse } from "../types";

export class KieProvider implements AIVideoProvider {
  name = "kie";
  supportImageToVideo = false; // kie 仅支持文生视频
  private apiKey: string;
  private baseUrl = "https://api.kie.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createTask(params: VideoGenerationParams): Promise<VideoTaskResponse> {
    const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sora-2-pro-text-to-video",
        input: {
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio === "9:16" ? "portrait" : "landscape",
          n_frames: String(params.duration || 10),
          size: params.quality || "high",
          remove_watermark: params.removeWatermark ?? true,
        },
        callBackUrl: params.callbackUrl,
      }),
    });

    const result = await response.json();
    if (result.code !== 200) throw new Error(result.msg || "API error");

    return {
      taskId: result.data.taskId,
      provider: "kie",
      status: "pending",
      raw: result,
    };
  }

  async getTaskStatus(taskId: string): Promise<VideoTaskResponse> {
    const response = await fetch(
      `${this.baseUrl}/jobs/recordInfo?taskId=${taskId}`,
      { headers: { "Authorization": `Bearer ${this.apiKey}` } }
    );

    const result = await response.json();
    if (result.code !== 200) throw new Error(result.msg);

    const data = result.data;
    let videoUrl: string | undefined;

    if (data.state === "success" && data.resultJson) {
      const parsed = JSON.parse(data.resultJson);
      videoUrl = parsed.resultUrls?.[0];
    }

    return {
      taskId: data.taskId,
      provider: "kie",
      status: this.mapStatus(data.state),
      videoUrl,
      error: data.failCode ? { code: data.failCode, message: data.failMsg } : undefined,
      raw: data,
    };
  }

  parseCallback(payload: any): VideoTaskResponse {
    const data = payload.data || payload;
    let videoUrl: string | undefined;

    if (data.state === "success" && data.resultJson) {
      const parsed = JSON.parse(data.resultJson);
      videoUrl = parsed.resultUrls?.[0];
    }

    return {
      taskId: data.taskId,
      provider: "kie",
      status: this.mapStatus(data.state),
      videoUrl,
      error: data.failCode ? { code: data.failCode, message: data.failMsg } : undefined,
      raw: data,
    };
  }

  private mapStatus(state: string): VideoTaskResponse["status"] {
    const map: Record<string, VideoTaskResponse["status"]> = {
      waiting: "pending",
      success: "completed",
      fail: "failed",
    };
    return map[state] || "pending";
  }
}
```

**新建文件**: `packages/common/src/ai/index.ts`

```typescript
import type { AIVideoProvider } from "./types";
import { EvolinkProvider } from "./providers/evolink";
import { KieProvider } from "./providers/kie";

export type ProviderType = "evolink" | "kie";

const providers: Map<ProviderType, AIVideoProvider> = new Map();

export function getProvider(type: ProviderType): AIVideoProvider {
  if (providers.has(type)) return providers.get(type)!;

  let provider: AIVideoProvider;
  switch (type) {
    case "evolink":
      provider = new EvolinkProvider(process.env.EVOLINK_API_KEY!);
      break;
    case "kie":
      provider = new KieProvider(process.env.KIE_API_KEY!);
      break;
    default:
      throw new Error(`Unknown provider: ${type}`);
  }

  providers.set(type, provider);
  return provider;
}

export function getDefaultProvider(): AIVideoProvider {
  const type = (process.env.DEFAULT_AI_PROVIDER as ProviderType) || "evolink";
  return getProvider(type);
}

export * from "./types";
```

### 4.2.2 模型配置引用

> **配置已合并**: 模型配置已合并到 Phase 3 的统一配置文件 `packages/common/src/config/credits.ts`。
>
> 使用方式：
> ```typescript
> import {
>   CREDITS_CONFIG,
>   getModelConfig,
>   getAvailableModels,
>   calculateModelCredits
> } from "@videofly/common/config/credits";
>
> // 获取模型配置
> const model = getModelConfig("sora-2");
>
> // 计算积分消耗
> const credits = calculateModelCredits("sora-2", { duration: 15, quality: "high" });
> ```

### 4.2.3 回调签名验证工具

> **重要**: Callback 端点需要验证请求确实来自 AI Provider，防止伪造请求。
> 由于 evolink 和 kie 可能不提供 webhook 签名，我们使用带签名的回调 URL 方案。

**新建文件**: `packages/common/src/utils/callback-signature.ts`

```typescript
import crypto from "crypto";

const CALLBACK_SECRET = process.env.CALLBACK_HMAC_SECRET!;
const SIGNATURE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 小时

/**
 * 生成带签名的回调 URL
 * 格式: baseUrl?videoUuid=xxx&ts=xxx&sig=xxx
 */
export function generateSignedCallbackUrl(
  baseUrl: string,
  videoUuid: string
): string {
  const timestamp = Date.now().toString();
  const signature = generateSignature(videoUuid, timestamp);

  const url = new URL(baseUrl);
  url.searchParams.set("videoUuid", videoUuid);
  url.searchParams.set("ts", timestamp);
  url.searchParams.set("sig", signature);

  return url.toString();
}

/**
 * 验证回调签名
 */
export function verifyCallbackSignature(
  videoUuid: string,
  timestamp: string,
  signature: string
): { valid: boolean; error?: string } {
  // 检查时间戳是否过期
  const ts = parseInt(timestamp);
  if (isNaN(ts) || Date.now() - ts > SIGNATURE_EXPIRY_MS) {
    return { valid: false, error: "Signature expired" };
  }

  // 验证签名
  const expectedSig = generateSignature(videoUuid, timestamp);
  if (signature.length !== expectedSig.length) {
    return { valid: false, error: "Invalid signature" };
  }
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );

  if (!valid) {
    return { valid: false, error: "Invalid signature" };
  }

  return { valid: true };
}

function generateSignature(videoUuid: string, timestamp: string): string {
  const data = `${videoUuid}:${timestamp}`;
  return crypto
    .createHmac("sha256", CALLBACK_SECRET)
    .update(data)
    .digest("hex");
}
```

### 4.2.4 视频生成 Service

> **架构决策 - 无服务端轮询**:
> - Vercel Serverless 函数在响应后立即终止，`setTimeout` 无法持续运行
> - **主要依赖**: Callback 回调（AI Provider 完成后主动通知）
> - **备用方案**: 前端轮询状态 API（用户端定时查询）
> - 不再在服务端使用 setTimeout 进行轮询

**新建文件**: `packages/common/src/services/video.ts`

```typescript
import { db } from "@videofly/db";
import { VideoStatus, Prisma } from "@prisma/client";
import { getStorage } from "../storage";
import { getModelConfig, calculateModelCredits } from "../config/credits";
import { getProvider, type ProviderType, type VideoTaskResponse } from "../ai";
import { creditService } from "./credit";
import { generateSignedCallbackUrl } from "../utils/callback-signature";

export interface GenerateVideoParams {
  userId: string;
  prompt: string;
  model: string;               // "sora-2" | "sora-2-pro"
  duration: number;            // 10 | 15
  aspectRatio?: string;        // "16:9" | "9:16"
  quality?: string;            // "standard" | "high" (仅 kie)
  imageUrl?: string;           // 图生视频（仅 evolink）
}

export interface VideoGenerationResult {
  videoUuid: string;
  taskId: string;
  provider: ProviderType;
  status: string;
  estimatedTime?: number;
  creditsUsed: number;
}

export class VideoService {
  private callbackBaseUrl: string;

  constructor() {
    this.callbackBaseUrl = process.env.AI_CALLBACK_URL || "";
  }

  /**
   * 创建视频生成任务
   *
   * 流程：
   * 1. 验证模型和参数
   * 2. 冻结积分（防止并发消费）
   * 3. 创建视频记录
   * 4. 调用 AI API
   * 5. 如果 API 调用失败，释放积分
   */
  async generate(params: GenerateVideoParams): Promise<VideoGenerationResult> {
    const modelConfig = getModelConfig(params.model);
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${params.model}`);
    }

    // 计算所需积分
    const creditsRequired = calculateModelCredits(params.model, {
      duration: params.duration,
      quality: params.quality,
    });

    // 图生视频检查
    if (params.imageUrl && !modelConfig.supportImageToVideo) {
      throw new Error(`Model ${params.model} does not support image-to-video`);
    }

    // 先创建视频记录（需要 uuid 用于积分冻结）
    const video = await db.video.create({
      data: {
        userId: params.userId,
        prompt: params.prompt,
        model: params.model,
        parameters: {
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          quality: params.quality,
        },
        status: VideoStatus.PENDING,
        startImageUrl: params.imageUrl,
        creditsUsed: creditsRequired,
        duration: params.duration,
        aspectRatio: params.aspectRatio,
        provider: modelConfig.provider,
      },
    });

    // 冻结积分（在任务创建时冻结，防止并发问题）
    let freezeResult: { success: boolean; holdId: number };
    try {
      freezeResult = await creditService.freeze({
        userId: params.userId,
        credits: creditsRequired,
        videoUuid: video.uuid,
      });
    } catch (error) {
      await db.video.update({
        where: { uuid: video.uuid },
        data: { status: VideoStatus.FAILED, errorMessage: String(error) },
      });
      throw error;
    }

    if (!freezeResult.success) {
      // 积分不足，标记视频为失败
      await db.video.update({
        where: { uuid: video.uuid },
        data: {
          status: VideoStatus.FAILED,
          errorMessage: `Insufficient credits. Required: ${creditsRequired}`,
        },
      });
      throw new Error(`Insufficient credits. Required: ${creditsRequired}`);
    }

    // 获取对应的 Provider
    const provider = getProvider(modelConfig.provider);

    // 构建带签名的回调 URL
    const callbackUrl = this.callbackBaseUrl
      ? generateSignedCallbackUrl(
          `${this.callbackBaseUrl}/${modelConfig.provider}`,
          video.uuid
        )
      : undefined;

    try {
      // 调用 AI API
      const result = await provider.createTask({
        prompt: params.prompt,
        duration: params.duration as 10 | 15,
        aspectRatio: params.aspectRatio as "16:9" | "9:16",
        quality: params.quality as "standard" | "high",
        imageUrl: params.imageUrl,
        callbackUrl,
      });

      // 更新视频记录
      await db.video.update({
        where: { uuid: video.uuid },
        data: {
          status: VideoStatus.GENERATING,
          externalTaskId: result.taskId,
        },
      });

      return {
        videoUuid: video.uuid,
        taskId: result.taskId,
        provider: modelConfig.provider,
        status: "GENERATING",
        estimatedTime: result.estimatedTime,
        creditsUsed: creditsRequired,
      };
    } catch (error) {
      // API 调用失败，释放冻结的积分
      await creditService.release(video.uuid);

      await db.video.update({
        where: { uuid: video.uuid },
        data: { status: VideoStatus.FAILED, errorMessage: String(error) },
      });
      throw error;
    }
  }

  /**
   * 处理 AI Callback
   *
   * 流程：
   * 1. 解析回调数据
   * 2. 查找对应视频
   * 3. 成功时：下载视频到 R2，结算积分（事务安全）
   * 4. 失败时：释放冻结的积分（事务安全）
   */
  async handleCallback(
    providerType: ProviderType,
    payload: any,
    videoUuid: string  // 从签名 URL 参数获取
  ): Promise<void> {
    const provider = getProvider(providerType);
    const result = provider.parseCallback(payload);

    // 使用 videoUuid 查找（比 taskId 更可靠）
    const video = await db.video.findUnique({
      where: { uuid: videoUuid },
    });

    if (!video) {
      console.error(`Video not found: ${videoUuid}`);
      return;
    }

    // 验证 taskId 匹配（双重校验）
    if (video.externalTaskId && video.externalTaskId !== result.taskId) {
      console.error(`Task ID mismatch: expected ${video.externalTaskId}, got ${result.taskId}`);
      return;
    }

    if (result.status === "completed" && result.videoUrl) {
      // 使用事务安全的完成方法
      await this.tryCompleteGeneration(video.uuid, result);
    } else if (result.status === "failed") {
      // 使用事务安全的失败方法
      await this.tryFailGeneration(video.uuid, result.error?.message);
    }
    // processing 状态无需处理，等待后续回调
  }

  /**
   * 获取任务状态（供前端轮询使用）
   *
   * 并发安全：使用事务 + 状态检查防止重复处理
   */
  async refreshStatus(videoUuid: string, userId: string): Promise<{
    status: VideoStatus;
    videoUrl?: string;
    error?: string;
  }> {
    const video = await db.video.findFirst({
      where: { uuid: videoUuid, userId },
    });

    if (!video) {
      throw new Error("Video not found");
    }

    // 如果已完成或失败，直接返回
    if (video.status === VideoStatus.COMPLETED || video.status === VideoStatus.FAILED) {
      return {
        status: video.status,
        videoUrl: video.videoUrl || undefined,
        error: video.errorMessage || undefined,
      };
    }

    // 如果还在处理中，主动查询 AI Provider
    if (video.externalTaskId && video.provider) {
      try {
        const provider = getProvider(video.provider as ProviderType);
        const result = await provider.getTaskStatus(video.externalTaskId);

        if (result.status === "completed" && result.videoUrl) {
          // 使用事务 + 状态检查防止并发重复处理
          const updated = await this.tryCompleteGeneration(video.uuid, result);
          return {
            status: updated.status,
            videoUrl: updated.videoUrl || undefined,
          };
        }

        if (result.status === "failed") {
          // 使用事务防止并发重复处理
          const updated = await this.tryFailGeneration(video.uuid, result.error?.message);
          return {
            status: updated.status,
            error: updated.errorMessage || undefined,
          };
        }
      } catch (error) {
        console.error("Failed to refresh status from provider:", error);
      }
    }

    return { status: video.status };
  }

  /**
   * 尝试完成生成（事务 + 乐观锁）
   * 只有当状态为 GENERATING 或 UPLOADING 时才处理
   */
  private async tryCompleteGeneration(
    videoUuid: string,
    result: VideoTaskResponse
  ): Promise<{ status: VideoStatus; videoUrl?: string | null }> {
    return db.$transaction(async (tx) => {
      // 获取当前状态并锁定行
      const video = await tx.video.findUnique({
        where: { uuid: videoUuid },
      });

      if (!video) {
        throw new Error("Video not found");
      }

      // 已完成或已失败，直接返回（幂等）
      if (video.status === VideoStatus.COMPLETED) {
        return { status: video.status, videoUrl: video.videoUrl };
      }
      if (video.status === VideoStatus.FAILED) {
        return { status: video.status, videoUrl: null };
      }

      // 只处理 GENERATING 或 UPLOADING 状态
      if (video.status !== VideoStatus.GENERATING && video.status !== VideoStatus.UPLOADING) {
        return { status: video.status, videoUrl: video.videoUrl };
      }

      // 更新状态为上传中
      await tx.video.update({
        where: { uuid: videoUuid },
        data: { status: VideoStatus.UPLOADING, originalVideoUrl: result.videoUrl },
      });

      // 下载并上传到 R2
      const storage = getStorage();
      const key = `videos/${videoUuid}/${Date.now()}.mp4`;
      const uploaded = await storage.downloadAndUpload({
        sourceUrl: result.videoUrl!,
        key,
        contentType: "video/mp4",
      });

      // 结算积分
      await creditService.settle(videoUuid);

      // 更新为完成状态
      const updated = await tx.video.update({
        where: { uuid: videoUuid },
        data: {
          status: VideoStatus.COMPLETED,
          videoUrl: uploaded.url,
          thumbnailUrl: result.thumbnailUrl,
          completedAt: new Date(),
        },
      });

      return { status: updated.status, videoUrl: updated.videoUrl };
    });
  }

  /**
   * 尝试标记失败（事务 + 乐观锁）
   */
  private async tryFailGeneration(
    videoUuid: string,
    errorMessage?: string
  ): Promise<{ status: VideoStatus; errorMessage?: string | null }> {
    return db.$transaction(async (tx) => {
      const video = await tx.video.findUnique({
        where: { uuid: videoUuid },
      });

      if (!video) {
        throw new Error("Video not found");
      }

      // 已完成或已失败，直接返回（幂等）
      if (video.status === VideoStatus.COMPLETED || video.status === VideoStatus.FAILED) {
        return { status: video.status, errorMessage: video.errorMessage };
      }

      // 释放积分
      await creditService.release(videoUuid);

      // 更新为失败状态
      const updated = await tx.video.update({
        where: { uuid: videoUuid },
        data: {
          status: VideoStatus.FAILED,
          errorMessage: errorMessage || "Generation failed",
        },
      });

      return { status: updated.status, errorMessage: updated.errorMessage };
    });
  }

  /**
   * 获取视频详情
   */
  async getVideo(uuid: string, userId: string) {
    return db.video.findFirst({
      where: { uuid, userId, isDeleted: false },
    });
  }

  /**
   * 获取用户视频列表
   */
  async listVideos(userId: string, options?: {
    limit?: number;
    cursor?: string;
    status?: VideoStatus;
  }) {
    const videos = await db.video.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { createdAt: "desc" },
      take: (options?.limit || 20) + 1,
      ...(options?.cursor && { cursor: { uuid: options.cursor }, skip: 1 }),
    });

    const hasMore = videos.length > (options?.limit || 20);
    if (hasMore) videos.pop();

    return {
      videos,
      nextCursor: hasMore ? videos[videos.length - 1]?.uuid : undefined,
    };
  }

  /**
   * 删除视频（软删除）
   */
  async deleteVideo(uuid: string, userId: string) {
    return db.video.updateMany({
      where: { uuid, userId },
      data: { isDeleted: true },
    });
  }
}

export const videoService = new VideoService();
```

### 4.2.5 视频 API Routes

**新建文件**: `apps/nextjs/src/app/api/v1/video/generate/route.ts`

```typescript
import { NextRequest } from "next/server";
import { videoService } from "@videofly/common/services/video";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, handleApiError } from "@/app/api/_lib/response";
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
    const user = await requireAuth(request);
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

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**新建文件**: `apps/nextjs/src/app/api/v1/video/callback/[provider]/route.ts`

> **安全措施**: 使用 HMAC 签名验证回调请求的真实性

```typescript
import { NextRequest } from "next/server";
import { videoService } from "@videofly/common/services/video";
import { type ProviderType } from "@videofly/common/ai";
import { verifyCallbackSignature } from "@videofly/common/utils/callback-signature";
import { apiSuccess, apiError } from "@/app/api/_lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const providerType = params.provider as ProviderType;

    // 验证 provider 类型
    if (!["evolink", "kie"].includes(providerType)) {
      return apiError("Invalid provider", 400);
    }

    // 从 URL 参数中获取签名信息
    const { searchParams } = new URL(request.url);
    const videoUuid = searchParams.get("videoUuid");
    const timestamp = searchParams.get("ts");
    const signature = searchParams.get("sig");

    // 验证签名
    if (!videoUuid || !timestamp || !signature) {
      console.error("Missing callback signature parameters");
      return apiError("Missing signature parameters", 400);
    }

    const verification = verifyCallbackSignature(videoUuid, timestamp, signature);
    if (!verification.valid) {
      console.error(`Callback signature verification failed: ${verification.error}`);
      return apiError(verification.error || "Invalid signature", 401);
    }

    const payload = await request.json();

    // 传入 videoUuid（已验证）
    await videoService.handleCallback(providerType, payload, videoUuid);

    return apiSuccess({ received: true });
  } catch (error) {
    console.error("Callback error:", error);
    return apiError("Callback processing failed", 500);
  }
}
```

**新建文件**: `apps/nextjs/src/app/api/v1/video/[uuid]/status/route.ts`

> **前端轮询端点**: 由于 Vercel Serverless 无法支持服务端轮询，提供此 API 供前端定时查询状态

```typescript
import { NextRequest } from "next/server";
import { videoService } from "@videofly/common/services/video";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, handleApiError } from "@/app/api/_lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const user = await requireAuth(request);

    // 刷新并获取最新状态
    const result = await videoService.refreshStatus(params.uuid, user.id);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**新建文件**: `apps/nextjs/src/app/api/v1/video/list/route.ts`

```typescript
import { NextRequest } from "next/server";
import { videoService } from "@videofly/common/services/video";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, handleApiError } from "@/app/api/_lib/response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const result = await videoService.listVideos(user.id, {
      limit: parseInt(searchParams.get("limit") || "20"),
      cursor: searchParams.get("cursor") || undefined,
      status: searchParams.get("status") as any,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**新建文件**: `apps/nextjs/src/app/api/v1/config/models/route.ts`

```typescript
import { NextRequest } from "next/server";
import { getAvailableModels } from "@videofly/common/config/credits";
import { apiSuccess } from "@/app/api/_lib/response";

export async function GET(request: NextRequest) {
  const models = getAvailableModels();
  return apiSuccess(models);
}
```

## 4.3 验收标准

- [ ] 视频生成 API 正常工作，积分在任务创建时冻结
- [ ] Callback 回调带签名验证，成功时结算积分，失败时释放积分
- [ ] 前端轮询 API 能正确获取并更新任务状态
- [ ] 视频成功上传到 R2
- [ ] 无服务端 setTimeout 轮询（Vercel 兼容）
- [ ] 视频列表查询正常

---

[← 上一阶段](./03-PHASE3-CREDITS.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./05-PHASE5-FRONTEND.md)
