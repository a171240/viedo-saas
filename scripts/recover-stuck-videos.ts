#!/usr/bin/env tsx

/**
 * Recover stuck video tasks by refreshing provider status and updating DB.
 */

import "dotenv/config";
import { db, videos, VideoStatus } from "@/db";
import { eq, or, sql } from "drizzle-orm";
import { videoService } from "@/services/video";

async function recoverVideo(videoUuid: string) {
  console.log(`\n[Recover] Video: ${videoUuid}`);

  const [video] = await db
    .select()
    .from(videos)
    .where(eq(videos.uuid, videoUuid))
    .limit(1);

  if (!video) {
    console.log("  - Not found");
    return;
  }

  console.log(`  - Status: ${video.status}`);
  console.log(`  - Provider: ${video.provider ?? "unknown"}`);
  console.log(`  - TaskId: ${video.externalTaskId ?? "none"}`);

  if (!video.externalTaskId || !video.provider) {
    console.log("  - Skip: missing provider or task id");
    return;
  }

  try {
    const result = await videoService.refreshStatus(video.uuid, video.userId);
    console.log(`  - Updated status: ${result.status}`);
    if (result.videoUrl) {
      console.log(`  - Video URL: ${result.videoUrl}`);
    }
    if (result.error) {
      console.log(`  - Error: ${result.error}`);
    }
  } catch (error) {
    console.error("  - Failed to refresh status:", error);
  }
}

async function main() {
  console.log("[Recover] Scanning stuck video tasks...\n");

  const stuckVideos = await db
    .select()
    .from(videos)
    .where(
      or(
        eq(videos.status, VideoStatus.PENDING),
        eq(videos.status, VideoStatus.GENERATING),
        eq(videos.status, VideoStatus.UPLOADING)
      )
    )
    .orderBy(sql`"videos"."created_at" DESC`)
    .limit(20);

  if (stuckVideos.length === 0) {
    console.log("[Recover] No stuck videos found.");
    process.exit(0);
  }

  console.log(`[Recover] Found ${stuckVideos.length} stuck videos.`);

  for (const video of stuckVideos) {
    await recoverVideo(video.uuid);
  }

  console.log("\n[Recover] Done.");
}

main().catch((error) => {
  console.error("[Recover] Failed:", error);
  process.exit(1);
});
