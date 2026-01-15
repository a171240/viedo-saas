import type {
  AIVideoProvider,
  VideoGenerationParams,
  VideoTaskResponse,
} from "../types";

export class KieProvider implements AIVideoProvider {
  name = "kie";
  supportImageToVideo = false; // kie only supports text-to-video
  private apiKey: string;
  private baseUrl = "https://api.kie.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createTask(params: VideoGenerationParams): Promise<VideoTaskResponse> {
    const response = await fetch(`${this.baseUrl}/jobs/createTask`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
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
      error: data.failCode
        ? { code: data.failCode, message: data.failMsg }
        : undefined,
      raw: data,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      error: data.failCode
        ? { code: data.failCode, message: data.failMsg }
        : undefined,
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
