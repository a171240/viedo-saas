# Phase 5: 前端页面

[← 上一阶段](./04-PHASE4-VIDEO-CORE.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./06-PHASE6-CREEM.md)

---

## 5.1 目标

- 集成已有的 VideoGeneratorInput 组件
- 创建视频生成页面
- 创建视频历史页面

## 5.2 详细任务

### 5.2.0 数据转换工具

> **重要**: VideoGeneratorInput 组件的 SubmitData 格式与后端 API 期望的格式不同，需要转换。

**新建文件**: `apps/nextjs/src/lib/video-api.ts`

```typescript
import type { SubmitData } from "~/components/video-generator";

/**
 * 将 VideoGeneratorInput 的 SubmitData 转换为 API 请求格式
 *
 * SubmitData 格式:
 * - duration: string (e.g., "10s", "15s")
 * - resolution: string (e.g., "720P", "1080P")
 * - model: string (e.g., "sora-2", "sora-2-pro")
 * - aspectRatio: string (e.g., "16:9", "9:16")
 * - images: File[]
 *
 * API 期望格式:
 * - duration: number (10 | 15)
 * - quality: "standard" | "high"
 * - model: "sora-2" | "sora-2-pro"
 * - aspectRatio: "16:9" | "9:16"
 * - imageUrl: string (已上传的 URL)
 */
export interface VideoGenerateRequest {
  prompt: string;
  model: "sora-2" | "sora-2-pro";
  duration: 10 | 15;
  aspectRatio?: "16:9" | "9:16";
  quality?: "standard" | "high";
  imageUrl?: string;
}

/**
 * 解析 duration 字符串为数字
 * "10s" -> 10, "15s" -> 15
 */
export function parseDuration(duration?: string): 10 | 15 {
  if (!duration) return 10;
  const num = parseInt(duration.replace(/\D/g, ""));
  return num === 15 ? 15 : 10;
}

/**
 * 将 resolution 转换为 quality
 * "1080P" / "1080p" -> "high"
 * "720P" / "720p" / other -> "standard"
 */
export function resolutionToQuality(resolution?: string): "standard" | "high" {
  if (!resolution) return "standard";
  return resolution.toLowerCase().includes("1080") ? "high" : "standard";
}

/**
 * 上传图片并返回公开 URL
 */
export async function uploadImage(file: File): Promise<string> {
  // 1. 获取预签名 URL
  const presignRes = await fetch("/api/v1/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  const presignData = await presignRes.json();
  if (!presignData.success) {
    throw new Error(presignData.error?.message || "Failed to get upload URL");
  }

  // 2. 上传文件
  const uploadRes = await fetch(presignData.data.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload image");
  }

  return presignData.data.publicUrl;
}

/**
 * 将 SubmitData 转换为 API 请求
 */
export async function transformSubmitData(
  data: SubmitData
): Promise<VideoGenerateRequest> {
  // 上传图片（如果有）
  let imageUrl: string | undefined;
  if (data.images && data.images.length > 0) {
    imageUrl = await uploadImage(data.images[0]);
  }

  return {
    prompt: data.prompt,
    model: data.model as "sora-2" | "sora-2-pro",
    duration: parseDuration(data.duration),
    aspectRatio: data.aspectRatio as "16:9" | "9:16" | undefined,
    quality: resolutionToQuality(data.resolution),
    imageUrl,
  };
}

/**
 * 调用视频生成 API
 */
export async function generateVideo(
  request: VideoGenerateRequest
): Promise<{ videoUuid: string; status: string; creditsUsed: number }> {
  const res = await fetch("/api/v1/video/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error?.message || "Failed to generate video");
  }

  return data.data;
}

/**
 * 获取视频状态（触发后端刷新）
 */
export async function getVideoStatus(
  videoUuid: string
): Promise<{ status: string; videoUrl?: string; error?: string }> {
  const res = await fetch(`/api/v1/video/${videoUuid}/status`);
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error?.message || "Failed to get video status");
  }

  return data.data;
}
```

### 5.2.1 视频生成页面

**新建/修改文件**: `apps/nextjs/src/app/[lang]/(marketing)/demo/video-generator/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { VideoGeneratorInput, type SubmitData } from "~/components/video-generator";
import { VideoStatusCard } from "~/components/video-generator/video-status-card";
import { toast } from "sonner";
import {
  transformSubmitData,
  generateVideo,
  getVideoStatus,
} from "~/lib/video-api";

export default function VideoGeneratorPage() {
  const [credits, setCredits] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTask, setCurrentTask] = useState<{
    uuid: string;
    status: string;
    videoUrl?: string;
    error?: string;
  } | null>(null);

  // 获取用户积分
  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/credit/balance");
      const data = await res.json();
      if (data.success) {
        setCredits(data.data.availableCredits);
      }
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    }
  }, []);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  // 前端轮询任务状态（使用新的 status API）
  useEffect(() => {
    if (!currentTask) return;
    if (currentTask.status === "COMPLETED" || currentTask.status === "FAILED") {
      return;
    }

    const pollStatus = async () => {
      try {
        // 使用正确的 status 端点
        const result = await getVideoStatus(currentTask.uuid);

        setCurrentTask(prev => ({
          ...prev!,
          status: result.status,
          videoUrl: result.videoUrl,
          error: result.error,
        }));

        if (result.status === "COMPLETED") {
          toast.success("Video generated successfully!");
          setIsGenerating(false);
          refreshCredits(); // 刷新积分（已结算）
        } else if (result.status === "FAILED") {
          toast.error(result.error || "Video generation failed");
          setIsGenerating(false);
          refreshCredits(); // 刷新积分（已释放）
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    // 每 5 秒轮询一次
    const interval = setInterval(pollStatus, 5000);

    // 立即执行一次
    pollStatus();

    return () => clearInterval(interval);
  }, [currentTask?.uuid, currentTask?.status, refreshCredits]);

  const handleSubmit = async (data: SubmitData) => {
    // 仅处理视频生成
    if (data.type !== "video") {
      toast.error("Only video generation is supported");
      return;
    }

    setIsGenerating(true);

    try {
      // 使用工具函数转换数据格式并上传图片
      const request = await transformSubmitData(data);

      // 调用生成 API
      const result = await generateVideo(request);

      setCurrentTask({
        uuid: result.videoUuid,
        status: result.status,
      });

      // 更新积分显示（已冻结）
      refreshCredits();

      toast.info(`Video generation started! ${result.creditsUsed} credits frozen.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred";
      toast.error(message);
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">AI Video Generator</h1>
        <p className="text-muted-foreground">
          Create stunning videos with AI
        </p>
      </div>

      <VideoGeneratorInput
        isLoading={isGenerating}
        disabled={credits <= 0}
        onSubmit={handleSubmit}
      />

      {currentTask && (
        <VideoStatusCard
          status={currentTask.status}
          videoUrl={currentTask.videoUrl}
          error={currentTask.error}
        />
      )}
    </div>
  );
}
```

### 5.2.2 视频历史页面

**新建文件**: `apps/nextjs/src/app/[lang]/(dashboard)/dashboard/videos/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { VideoCard } from "~/components/video-generator/video-card";
import { Button } from "@videofly/ui/button";
import { Skeleton } from "@videofly/ui/skeleton";

interface Video {
  uuid: string;
  prompt: string;
  model: string;
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  creditsUsed: number;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  const loadVideos = async (cursor?: string) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`/api/v1/video/list?${params}`);
    const data = await res.json();

    if (data.success) {
      if (cursor) {
        setVideos(prev => [...prev, ...data.data.videos]);
      } else {
        setVideos(data.data.videos);
      }
      setNextCursor(data.data.nextCursor);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleDelete = async (uuid: string) => {
    const res = await fetch(`/api/v1/video/${uuid}`, { method: "DELETE" });
    if (res.ok) {
      setVideos(prev => prev.filter(v => v.uuid !== uuid));
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Videos</h1>
        <Button asChild>
          <a href="/demo/video-generator">Create New</a>
        </Button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No videos yet</p>
          <Button className="mt-4" asChild>
            <a href="/demo/video-generator">Create your first video</a>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <VideoCard
                key={video.uuid}
                video={video}
                onDelete={() => handleDelete(video.uuid)}
              />
            ))}
          </div>

          {nextCursor && (
            <div className="text-center">
              <Button variant="outline" onClick={() => loadVideos(nextCursor)}>
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## 5.3 验收标准

- [ ] 视频生成页面正常显示
- [ ] 提交表单后能发起生成请求
- [ ] 生成状态实时更新
- [ ] 视频历史页面正常显示
- [ ] 视频列表分页加载正常
- [ ] 删除视频功能正常

---

[← 上一阶段](./04-PHASE4-VIDEO-CORE.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./06-PHASE6-CREEM.md)
