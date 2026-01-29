import { NextRequest } from "next/server";
import { videoService } from "@/services/video";
import { requireAuth } from "@/lib/api/auth";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";
import { RATE_LIMITS } from "@/config/rate-limit";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
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
    const rate = rateLimit(
      `video_generate:${user.id}:${ip}`,
      RATE_LIMITS.videoGenerate,
    );
    if (!rate.allowed) {
      return Response.json(
        {
          success: false,
          error: { message: "Rate limit exceeded" },
        },
        {
          status: 429,
          headers: {
            "Retry-After": rate.retryAfter.toString(),
            "X-RateLimit-Limit": RATE_LIMITS.videoGenerate.max.toString(),
            "X-RateLimit-Remaining": rate.remaining.toString(),
            "X-RateLimit-Reset": rate.reset.toString(),
          },
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
