import { and, eq, lt } from "drizzle-orm";
import { db, videos } from "@/db";
import { getProvider, type ProviderType, type VideoTaskResponse } from "@/ai";
import {
  VIDEO_RECOVERY_CONFIG,
  type RecoverableVideoStatus,
} from "@/config/video-recovery";
import { videoService } from "@/services/video";

type RecoveryAction =
  | "complete"
  | "fail_missing_task"
  | "fail_provider"
  | "fail_timeout"
  | "query_failed";

type RecoveryResult = {
  uuid: string;
  status: string;
  updatedAt: string;
  ageMinutes: number;
  provider?: string | null;
  externalTaskId?: string | null;
  providerStatus?: VideoTaskResponse["status"] | "unknown";
  action: RecoveryAction;
  error?: string;
};

export type RecoverySummary = {
  dryRun: boolean;
  total: number;
  applied: number;
  results: RecoveryResult[];
};

const computeCutoff = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000);

const getStuckCandidates = async (limit: number) => {
  const statuses = Object.keys(
    VIDEO_RECOVERY_CONFIG.statusTimeoutMinutes
  ) as RecoverableVideoStatus[];

  const candidates = (
    await Promise.all(
      statuses.map((status) =>
        db
          .select()
          .from(videos)
          .where(
            and(
              eq(videos.status, status),
              lt(
                videos.updatedAt,
                computeCutoff(
                  VIDEO_RECOVERY_CONFIG.statusTimeoutMinutes[status]
                )
              )
            )
          )
      )
    )
  ).flat();

  const sorted = candidates.sort((a, b) => {
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  });

  return sorted.slice(0, limit);
};

export async function recoverStuckVideos(options?: {
  dryRun?: boolean;
  limit?: number;
}): Promise<RecoverySummary> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? VIDEO_RECOVERY_CONFIG.maxBatchSize;
  const now = Date.now();

  const candidates = await getStuckCandidates(limit);
  const results: RecoveryResult[] = [];
  let applied = 0;

  for (const video of candidates) {
    const ageMinutes = Math.floor((now - video.updatedAt.getTime()) / 60000);

    if (!video.externalTaskId || !video.provider) {
      const action: RecoveryAction = "fail_missing_task";
      if (!dryRun) {
        await videoService.recoverFail(
          video.uuid,
          "Missing provider/task id for recovery"
        );
        applied += 1;
      }
      results.push({
        uuid: video.uuid,
        status: video.status,
        updatedAt: video.updatedAt.toISOString(),
        ageMinutes,
        provider: video.provider,
        externalTaskId: video.externalTaskId,
        action,
      });
      continue;
    }

    let providerStatus: VideoTaskResponse | null = null;
    try {
      const provider = getProvider(video.provider as ProviderType);
      providerStatus = await provider.getTaskStatus(video.externalTaskId);
    } catch (error) {
      const action: RecoveryAction = "query_failed";
      results.push({
        uuid: video.uuid,
        status: video.status,
        updatedAt: video.updatedAt.toISOString(),
        ageMinutes,
        provider: video.provider,
        externalTaskId: video.externalTaskId,
        providerStatus: "unknown",
        action,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      continue;
    }

    if (providerStatus.status === "completed" && providerStatus.videoUrl) {
      const action: RecoveryAction = "complete";
      if (!dryRun) {
        await videoService.recoverComplete(video.uuid, providerStatus);
        applied += 1;
      }
      results.push({
        uuid: video.uuid,
        status: video.status,
        updatedAt: video.updatedAt.toISOString(),
        ageMinutes,
        provider: video.provider,
        externalTaskId: video.externalTaskId,
        providerStatus: providerStatus.status,
        action,
      });
      continue;
    }

    if (providerStatus.status === "failed") {
      const action: RecoveryAction = "fail_provider";
      if (!dryRun) {
        await videoService.recoverFail(
          video.uuid,
          providerStatus.error?.message || "Provider reported failure"
        );
        applied += 1;
      }
      results.push({
        uuid: video.uuid,
        status: video.status,
        updatedAt: video.updatedAt.toISOString(),
        ageMinutes,
        provider: video.provider,
        externalTaskId: video.externalTaskId,
        providerStatus: providerStatus.status,
        action,
      });
      continue;
    }

    // Pending/processing and considered stuck by timeout
    const action: RecoveryAction = "fail_timeout";
    if (!dryRun && VIDEO_RECOVERY_CONFIG.autoFailProcessing) {
      await videoService.recoverFail(
        video.uuid,
        `Stuck in ${video.status} for ${ageMinutes} minutes`
      );
      applied += 1;
    }

    results.push({
      uuid: video.uuid,
      status: video.status,
      updatedAt: video.updatedAt.toISOString(),
      ageMinutes,
      provider: video.provider,
      externalTaskId: video.externalTaskId,
      providerStatus: providerStatus.status,
      action,
    });
  }

  return {
    dryRun,
    total: candidates.length,
    applied,
    results,
  };
}
