import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type ProviderType, type VideoTaskResponse } from "@/ai";
import { VIDEO_RECOVERY_CONFIG } from "@/config/video-recovery";
import { recoverStuckVideos } from "@/services/video-recovery";

/**
 * 恢复卡住的视频任务
 * GET /api/v1/video/recover?secret=YOUR_SECRET&limit=20 (dry-run preview)
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员密钥
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.CALLBACK_HMAC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Number.parseInt(
      searchParams.get("limit") || `${VIDEO_RECOVERY_CONFIG.maxBatchSize}`
    );

    const summary = await recoverStuckVideos({
      dryRun: true,
      limit,
    });

    if (summary.total === 0) {
      return NextResponse.json({
        success: true,
        message: "No stuck videos found",
        recovered: 0,
        ...summary,
      });
    }

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("Recover API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * 手动触发视频完成 / 批量恢复
 * POST /api/v1/video/recover?secret=YOUR_SECRET
 * Body:
 * 1) { videoUuid, videoUrl, thumbnailUrl }  // manual completion
 * 2) { action: "recover", dryRun?: boolean, limit?: number } // auto recovery
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员密钥
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== process.env.CALLBACK_HMAC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    if (body?.action === "recover") {
      const dryRun = body?.dryRun === true;
      const rawLimit =
        typeof body?.limit === "number"
          ? body.limit
          : Number.parseInt(String(body?.limit ?? ""), 10);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0
        ? rawLimit
        : VIDEO_RECOVERY_CONFIG.maxBatchSize;

      const summary = await recoverStuckVideos({
        dryRun,
        limit,
      });

      return NextResponse.json({
        success: true,
        ...summary,
      });
    }

    const videoUuid = body?.videoUuid as string | undefined;
    const videoUrl = body?.videoUrl as string | undefined;
    const thumbnailUrl = body?.thumbnailUrl as string | undefined;

    if (!videoUuid || !videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields: videoUuid, videoUrl" },
        { status: 400 }
      );
    }

    // 获取视频信息
    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.uuid, videoUuid))
      .limit(1);

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 手动触发完成流程
    const { videoService } = await import("@/services/video");
    const provider = (video.provider as ProviderType) || "evolink";
    const taskId = video.externalTaskId || `manual_${videoUuid}`;
    const result: VideoTaskResponse = {
      taskId,
      provider,
      status: "completed",
      videoUrl,
      thumbnailUrl: thumbnailUrl || undefined,
    };
    await videoService.recoverComplete(videoUuid, result);

    return NextResponse.json({
      success: true,
      message: "Video recovered successfully",
    });
  } catch (error) {
    console.error("Recover POST error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
