// Video Generator Types

export type GenerationType = "video" | "image";

export interface VideoModel {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  maxDuration?: number;
  creditCost: number;
  supportImageToVideo?: boolean;
  durations?: number[];
  aspectRatios?: string[];
  qualities?: string[];
}

export interface SubmitData {
  type: GenerationType;
  prompt: string;
  images?: File[];
  model: string;
  aspectRatio?: string;
  duration?: string;
  resolution?: string;
  quality?: string;
  estimatedCredits: number;
}

export interface VideoGeneratorInputProps {
  models?: VideoModel[];
  isLoading?: boolean;
  disabled?: boolean;
  onSubmit: (data: SubmitData) => void;
  calculateCredits?: (params: {
    model: string;
    duration: number;
    quality?: string;
  }) => number;
}
