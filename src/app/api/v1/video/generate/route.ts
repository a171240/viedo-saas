import { NextRequest } from "next/server";
import { videoService } from "@/services/video";
import { requireAuth } from "@/lib/api/auth";
import { apiSuccess, handleApiError } from "@/lib/api/response";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(1).max(5000),
  model: z.literal("sora-2"),
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
