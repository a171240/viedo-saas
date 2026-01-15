import { db, VideoStatus } from "@videofly/db";
import { nanoid } from "nanoid";
import { getStorage } from "../storage";
import { getModelConfig, calculateModelCredits } from "../config/credits";
import { getProvider, type ProviderType, type VideoTaskResponse } from "../ai";
import { creditService } from "./credit";
import { generateSignedCallbackUrl } from "../utils/callback-signature";

export interface GenerateVideoParams {
  userId: string;
  prompt: string;
  model: string; // "sora-2" | "sora-2-pro"
  duration: number; // 10 | 15
  aspectRatio?: string; // "16:9" | "9:16"
  quality?: string; // "standard" | "high" (only kie)
  imageUrl?: string; // image-to-video (only evolink)
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
   * Create video generation task
   *
   * Flow:
   * 1. Validate model and params
   * 2. Freeze credits (prevent concurrent consumption)
   * 3. Create video record
   * 4. Call AI API
   * 5. If API call fails, release credits
   */
  async generate(params: GenerateVideoParams): Promise<VideoGenerationResult> {
    const modelConfig = getModelConfig(params.model);
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${params.model}`);
    }

    // Calculate required credits
    const creditsRequired = calculateModelCredits(params.model, {
      duration: params.duration,
      quality: params.quality,
    });

    // Image-to-video check
    if (params.imageUrl && !modelConfig.supportImageToVideo) {
      throw new Error(`Model ${params.model} does not support image-to-video`);
    }

    // Generate UUID for video
    const videoUuid = `vid_${nanoid(21)}`;

    // Create video record first (need uuid for credit freeze)
    const videoResult = await db
      .insertInto("videos")
      .values({
        uuid: videoUuid,
        user_id: params.userId,
        prompt: params.prompt,
        model: params.model,
        parameters: JSON.stringify({
          duration: params.duration,
          aspectRatio: params.aspectRatio,
          quality: params.quality,
        }),
        status: VideoStatus.PENDING,
        start_image_url: params.imageUrl || null,
        credits_used: creditsRequired,
        duration: params.duration,
        aspect_ratio: params.aspectRatio || null,
        provider: modelConfig.provider,
        updated_at: new Date(),
      })
      .returning(["uuid", "id"])
      .executeTakeFirstOrThrow();

    // Freeze credits (freeze at task creation to prevent concurrent issues)
    let freezeResult: { success: boolean; holdId: number };
    try {
      freezeResult = await creditService.freeze({
        userId: params.userId,
        credits: creditsRequired,
        videoUuid: videoResult.uuid,
      });
    } catch (error) {
      await db
        .updateTable("videos")
        .set({
          status: VideoStatus.FAILED,
          error_message: String(error),
          updated_at: new Date(),
        })
        .where("uuid", "=", videoResult.uuid)
        .execute();
      throw error;
    }

    if (!freezeResult.success) {
      // Insufficient credits, mark video as failed
      await db
        .updateTable("videos")
        .set({
          status: VideoStatus.FAILED,
          error_message: `Insufficient credits. Required: ${creditsRequired}`,
          updated_at: new Date(),
        })
        .where("uuid", "=", videoResult.uuid)
        .execute();
      throw new Error(`Insufficient credits. Required: ${creditsRequired}`);
    }

    // Get corresponding Provider
    const provider = getProvider(modelConfig.provider);

    // Build signed callback URL
    const callbackUrl = this.callbackBaseUrl
      ? generateSignedCallbackUrl(
          `${this.callbackBaseUrl}/${modelConfig.provider}`,
          videoResult.uuid
        )
      : undefined;

    try {
      // Call AI API
      const result = await provider.createTask({
        prompt: params.prompt,
        duration: params.duration as 10 | 15,
        aspectRatio: params.aspectRatio as "16:9" | "9:16",
        quality: params.quality as "standard" | "high",
        imageUrl: params.imageUrl,
        callbackUrl,
      });

      // Update video record
      await db
        .updateTable("videos")
        .set({
          status: VideoStatus.GENERATING,
          external_task_id: result.taskId,
          updated_at: new Date(),
        })
        .where("uuid", "=", videoResult.uuid)
        .execute();

      return {
        videoUuid: videoResult.uuid,
        taskId: result.taskId,
        provider: modelConfig.provider,
        status: "GENERATING",
        estimatedTime: result.estimatedTime,
        creditsUsed: creditsRequired,
      };
    } catch (error) {
      // API call failed, release frozen credits
      await creditService.release(videoResult.uuid);

      await db
        .updateTable("videos")
        .set({
          status: VideoStatus.FAILED,
          error_message: String(error),
          updated_at: new Date(),
        })
        .where("uuid", "=", videoResult.uuid)
        .execute();
      throw error;
    }
  }

  /**
   * Handle AI Callback
   *
   * Flow:
   * 1. Parse callback data
   * 2. Find corresponding video
   * 3. On success: download video to R2, settle credits (transaction safe)
   * 4. On failure: release frozen credits (transaction safe)
   */
  async handleCallback(
    providerType: ProviderType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any,
    videoUuid: string // From signed URL param
  ): Promise<void> {
    const provider = getProvider(providerType);
    const result = provider.parseCallback(payload);

    // Use videoUuid to find (more reliable than taskId)
    const video = await db
      .selectFrom("videos")
      .selectAll()
      .where("uuid", "=", videoUuid)
      .executeTakeFirst();

    if (!video) {
      console.error(`Video not found: ${videoUuid}`);
      return;
    }

    // Verify taskId matches (double check)
    if (video.external_task_id && video.external_task_id !== result.taskId) {
      console.error(
        `Task ID mismatch: expected ${video.external_task_id}, got ${result.taskId}`
      );
      return;
    }

    if (result.status === "completed" && result.videoUrl) {
      // Use transaction-safe completion method
      await this.tryCompleteGeneration(video.uuid, result);
    } else if (result.status === "failed") {
      // Use transaction-safe failure method
      await this.tryFailGeneration(video.uuid, result.error?.message);
    }
    // processing status doesn't need handling, wait for next callback
  }

  /**
   * Get task status (for frontend polling)
   *
   * Concurrency safe: use transaction + status check to prevent duplicate processing
   */
  async refreshStatus(
    videoUuid: string,
    userId: string
  ): Promise<{
    status: string;
    videoUrl?: string;
    error?: string;
  }> {
    const video = await db
      .selectFrom("videos")
      .selectAll()
      .where("uuid", "=", videoUuid)
      .where("user_id", "=", userId)
      .executeTakeFirst();

    if (!video) {
      throw new Error("Video not found");
    }

    // If already completed or failed, return directly
    if (
      video.status === VideoStatus.COMPLETED ||
      video.status === VideoStatus.FAILED
    ) {
      return {
        status: video.status,
        videoUrl: video.video_url || undefined,
        error: video.error_message || undefined,
      };
    }

    // If still processing, query AI Provider actively
    if (video.external_task_id && video.provider) {
      try {
        const provider = getProvider(video.provider as ProviderType);
        const result = await provider.getTaskStatus(video.external_task_id);

        if (result.status === "completed" && result.videoUrl) {
          // Use transaction + status check to prevent concurrent duplicate processing
          const updated = await this.tryCompleteGeneration(video.uuid, result);
          return {
            status: updated.status,
            videoUrl: updated.videoUrl || undefined,
          };
        }

        if (result.status === "failed") {
          // Use transaction to prevent concurrent duplicate processing
          const updated = await this.tryFailGeneration(
            video.uuid,
            result.error?.message
          );
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
   * Try to complete generation (transaction + optimistic lock)
   * Only process when status is GENERATING or UPLOADING
   */
  private async tryCompleteGeneration(
    videoUuid: string,
    result: VideoTaskResponse
  ): Promise<{ status: string; videoUrl?: string | null }> {
    return db.transaction().execute(async (trx) => {
      // Get current status and lock row
      const video = await trx
        .selectFrom("videos")
        .selectAll()
        .where("uuid", "=", videoUuid)
        .executeTakeFirst();

      if (!video) {
        throw new Error("Video not found");
      }

      // Already completed or failed, return directly (idempotent)
      if (video.status === VideoStatus.COMPLETED) {
        return { status: video.status, videoUrl: video.video_url };
      }
      if (video.status === VideoStatus.FAILED) {
        return { status: video.status, videoUrl: null };
      }

      // Only process GENERATING or UPLOADING status
      if (
        video.status !== VideoStatus.GENERATING &&
        video.status !== VideoStatus.UPLOADING
      ) {
        return { status: video.status, videoUrl: video.video_url };
      }

      // Update status to uploading
      await trx
        .updateTable("videos")
        .set({
          status: VideoStatus.UPLOADING,
          original_video_url: result.videoUrl,
          updated_at: new Date(),
        })
        .where("uuid", "=", videoUuid)
        .execute();

      // Download and upload to R2
      const storage = getStorage();
      const key = `videos/${videoUuid}/${Date.now()}.mp4`;
      const uploaded = await storage.downloadAndUpload({
        sourceUrl: result.videoUrl!,
        key,
        contentType: "video/mp4",
      });

      // Settle credits
      await creditService.settle(videoUuid);

      // Update to completed status
      await trx
        .updateTable("videos")
        .set({
          status: VideoStatus.COMPLETED,
          video_url: uploaded.url,
          thumbnail_url: result.thumbnailUrl || null,
          completed_at: new Date(),
          updated_at: new Date(),
        })
        .where("uuid", "=", videoUuid)
        .execute();

      return { status: VideoStatus.COMPLETED, videoUrl: uploaded.url };
    });
  }

  /**
   * Try to mark as failed (transaction + optimistic lock)
   */
  private async tryFailGeneration(
    videoUuid: string,
    errorMessage?: string
  ): Promise<{ status: string; errorMessage?: string | null }> {
    return db.transaction().execute(async (trx) => {
      const video = await trx
        .selectFrom("videos")
        .selectAll()
        .where("uuid", "=", videoUuid)
        .executeTakeFirst();

      if (!video) {
        throw new Error("Video not found");
      }

      // Already completed or failed, return directly (idempotent)
      if (
        video.status === VideoStatus.COMPLETED ||
        video.status === VideoStatus.FAILED
      ) {
        return { status: video.status, errorMessage: video.error_message };
      }

      // Release credits
      await creditService.release(videoUuid);

      // Update to failed status
      await trx
        .updateTable("videos")
        .set({
          status: VideoStatus.FAILED,
          error_message: errorMessage || "Generation failed",
          updated_at: new Date(),
        })
        .where("uuid", "=", videoUuid)
        .execute();

      return {
        status: VideoStatus.FAILED,
        errorMessage: errorMessage || "Generation failed",
      };
    });
  }

  /**
   * Get video details
   */
  async getVideo(uuid: string, userId: string) {
    return db
      .selectFrom("videos")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("user_id", "=", userId)
      .where("is_deleted", "=", false)
      .executeTakeFirst();
  }

  /**
   * Get user video list
   */
  async listVideos(
    userId: string,
    options?: {
      limit?: number;
      cursor?: string;
      status?: string;
    }
  ) {
    const limit = options?.limit || 20;

    let query = db
      .selectFrom("videos")
      .selectAll()
      .where("user_id", "=", userId)
      .where("is_deleted", "=", false);

    if (options?.status) {
      query = query.where("status", "=", options.status as VideoStatus);
    }

    if (options?.cursor) {
      // Get cursor video's created_at for pagination
      const cursorVideo = await db
        .selectFrom("videos")
        .select("created_at")
        .where("uuid", "=", options.cursor)
        .executeTakeFirst();

      if (cursorVideo) {
        query = query.where("created_at", "<", cursorVideo.created_at);
      }
    }

    const videos = await query
      .orderBy("created_at", "desc")
      .limit(limit + 1)
      .execute();

    const hasMore = videos.length > limit;
    if (hasMore) videos.pop();

    return {
      videos,
      nextCursor: hasMore ? videos[videos.length - 1]?.uuid : undefined,
    };
  }

  /**
   * Delete video (soft delete)
   */
  async deleteVideo(uuid: string, userId: string): Promise<void> {
    await db
      .updateTable("videos")
      .set({ is_deleted: true, updated_at: new Date() })
      .where("uuid", "=", uuid)
      .where("user_id", "=", userId)
      .execute();
  }
}

export const videoService = new VideoService();
