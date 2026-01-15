import type {
  AIVideoProvider,
  VideoGenerationParams,
  VideoTaskResponse,
} from "../types";

export class EvolinkProvider implements AIVideoProvider {
  name = "evolink";
  supportImageToVideo = true; // evolink supports image-to-video
  private apiKey: string;
  private baseUrl = "https://api.evolink.ai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createTask(params: VideoGenerationParams): Promise<VideoTaskResponse> {
    const response = await fetch(`${this.baseUrl}/videos/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
    const response = await fetch(
      `${this.baseUrl}/videos/generations/${taskId}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
