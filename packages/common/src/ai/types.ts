// AI Video Provider Types

// Unified video generation parameters
export interface VideoGenerationParams {
  prompt: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  duration?: 10 | 15;
  quality?: "standard" | "high";
  imageUrl?: string;
  removeWatermark?: boolean;
  callbackUrl?: string;
}

// Unified task response
export interface VideoTaskResponse {
  taskId: string;
  provider: "evolink" | "kie";
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  estimatedTime?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: {
    code: string;
    message: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;
}

// Provider interface
export interface AIVideoProvider {
  name: string;
  supportImageToVideo: boolean;
  createTask(params: VideoGenerationParams): Promise<VideoTaskResponse>;
  getTaskStatus(taskId: string): Promise<VideoTaskResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseCallback(payload: any): VideoTaskResponse;
}
