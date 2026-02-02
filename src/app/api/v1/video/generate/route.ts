import { NextRequest } from "next/server";
import { videoService } from "@/services/video";
import { requireAuth } from "@/lib/api/auth";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { ApiError } from "@/lib/api/error";
import { getUserUsageLimits } from "@/services/usage-limits";
import { USAGE_LIMITS } from "@/config/usage-limits";
import { db, VideoStatus, videos } from "@/db";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import { isDevBypassEnabled } from "@/lib/auth/dev-bypass";
// Import proxy configuration for fetch requests
import "@/lib/proxy-config";

const generateSchema = z.object({
  prompt: z.string().min(1).max(5000),
  model: z.string().min(1),
  duration: z.number().optional(),
  aspectRatio: z.string().optional(),
  quality: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  mode: z.string().optional(),
  outputNumber: z.number().int().min(1).optional().default(1),
  generateAudio: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const ip = getRequestIp(request);
    const usage = await getUserUsageLimits(user.id);
    const now = Date.now();
    const devBypass = isDevBypassEnabled();

    if (!devBypass && usage.createdAt) {
      const accountAgeMinutes = Math.floor(
        (now - usage.createdAt.getTime()) / 60000
      );
      if (accountAgeMinutes < USAGE_LIMITS.accountCooldownMinutes) {
        const retryAfter = Math.max(
          0,
          USAGE_LIMITS.accountCooldownMinutes * 60 - accountAgeMinutes * 60
        );
        throw new ApiError("Account cooldown in effect", 429, {
          reason: "cooldown",
          retryAfterSeconds: retryAfter,
        });
      }
    }

    const dailyLimit = usage.isPaid
      ? USAGE_LIMITS.paid.dailyMax
      : USAGE_LIMITS.free.dailyMax;
    if (!devBypass && dailyLimit > 0) {
      const since = new Date(now - 24 * 60 * 60 * 1000);
      const dailyResult = await db
        .select({ count: count() })
        .from(videos)
        .where(
          and(
            eq(videos.userId, user.id),
            eq(videos.isDeleted, false),
            gte(videos.createdAt, since)
          )
        );
      const dailyCount = Number(dailyResult[0]?.count ?? 0);
      if (dailyCount >= dailyLimit) {
        throw new ApiError("Daily generation limit reached", 429, {
          reason: "daily_limit",
          limit: dailyLimit,
        });
      }
    }

    const maxParallelTasks = usage.maxParallelTasks;
    if (!devBypass && maxParallelTasks > 0) {
      const runningResult = await db
        .select({ count: count() })
        .from(videos)
        .where(
          and(
            eq(videos.userId, user.id),
            eq(videos.isDeleted, false),
            inArray(videos.status, [
              VideoStatus.PENDING,
              VideoStatus.GENERATING,
              VideoStatus.UPLOADING,
            ])
          )
        );
      const runningCount = Number(runningResult[0]?.count ?? 0);
      if (runningCount >= maxParallelTasks) {
        throw new ApiError("Concurrent task limit reached", 429, {
          reason: "parallel_limit",
          maxParallelTasks,
          runningCount,
        });
      }
    }

    if (!devBypass) {
      const rateConfig = usage.isPaid
        ? USAGE_LIMITS.paid.rateLimit
        : USAGE_LIMITS.free.rateLimit;
      const rate = rateLimit(
        `video_generate:${user.id}:${ip}`,
        rateConfig
      );
      if (!rate.allowed) {
        return Response.json(
          {
            success: false,
            error: {
              message: "Rate limit exceeded",
              details: { reason: "rate_limit", scope: "user_ip" },
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": rate.retryAfter.toString(),
              "X-RateLimit-Limit": rateConfig.max.toString(),
              "X-RateLimit-Remaining": rate.remaining.toString(),
              "X-RateLimit-Reset": rate.reset.toString(),
            },
          }
        );
      }

      if (!usage.isPaid) {
        const ipRate = rateLimit(
          `video_generate:ip:${ip}`,
          USAGE_LIMITS.free.ipRateLimit
        );
        if (!ipRate.allowed) {
          return Response.json(
            {
              success: false,
              error: {
                message: "Rate limit exceeded",
                details: { reason: "rate_limit", scope: "ip" },
              },
            },
            {
              status: 429,
              headers: {
                "Retry-After": ipRate.retryAfter.toString(),
                "X-RateLimit-Limit": USAGE_LIMITS.free.ipRateLimit.max.toString(),
                "X-RateLimit-Remaining": ipRate.remaining.toString(),
                "X-RateLimit-Reset": ipRate.reset.toString(),
              },
            }
          );
        }
      } else {
        const paidIpRate = rateLimit(
          `video_generate:ip:${ip}`,
          USAGE_LIMITS.paid.ipRateLimit
        );
        if (!paidIpRate.allowed) {
          return Response.json(
            {
              success: false,
              error: {
                message: "Rate limit exceeded",
                details: { reason: "rate_limit", scope: "ip" },
              },
            },
            {
              status: 429,
              headers: {
                "Retry-After": paidIpRate.retryAfter.toString(),
                "X-RateLimit-Limit": USAGE_LIMITS.paid.ipRateLimit.max.toString(),
                "X-RateLimit-Remaining": paidIpRate.remaining.toString(),
                "X-RateLimit-Reset": paidIpRate.reset.toString(),
              },
            }
          );
        }
      }
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
      imageUrls: data.imageUrls,
      mode: data.mode,
      outputNumber: data.outputNumber,
      generateAudio: data.generateAudio,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
