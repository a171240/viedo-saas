export type ModelCapability = {
  supportedDurations: number[];
  supportedRatios: string[];
  supportedResolutions?: string[];
  supportsAudio?: boolean;
};

export const MODEL_CAPABILITIES: Record<string, ModelCapability> = {
  "sora-2": {
    supportedDurations: [10, 15],
    supportedRatios: ["16:9", "9:16"],
  },
  "wan2.6": {
    supportedDurations: [5, 10],
    supportedRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
    supportedResolutions: ["720P", "1080P"],
    supportsAudio: true,
  },
  "veo-3.1": {
    supportedDurations: [8],
    supportedRatios: ["16:9", "9:16"],
  },
  "seedance-1.5-pro": {
    supportedDurations: [4, 5, 6, 7, 8, 9, 10, 11, 12],
    supportedRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    supportedResolutions: ["480P", "720P", "1080P"],
    supportsAudio: true,
  },
};

export function getModelCapabilities(modelId: string): ModelCapability | undefined {
  return MODEL_CAPABILITIES[modelId];
}
