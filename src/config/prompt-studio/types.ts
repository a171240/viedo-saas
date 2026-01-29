export type Locale = "en" | "zh";

export type UseCase =
  | "product_ads"
  | "ugc_ads"
  | "app_promo"
  | "brand_story"
  | "local_leadgen";

export type Framework =
  | "hook_value_cta"
  | "pas"
  | "aida"
  | "before_after_bridge";

export type PromptStudioInput = Record<string, string | string[]>;

export type PromptStudioOutput = {
  positioningLine: string;
  angles: string[];
  calendar4x4: { stage: "Acquire" | "Trust" | "Convert" | "Retain"; angles: string[] }[];
  script: {
    hook: string;
    valuePoints: string[];
    proof: string;
    cta: string;
    onScreenText: string[];
    shotList: string[];
  };
  videoPrompt: string;
  negativePrompt?: string;
  metadata: {
    ratio: "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
    durationSeconds: number;
    resolution?: "720p" | "1080p";
    outputNumber?: number;
    generateAudio?: boolean;
  };
};

export type PromptTemplate = {
  id: string;
  locale: Locale;
  useCase: UseCase;
  framework: Framework;
  name: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "textarea" | "tags" | "select";
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  build: (input: PromptStudioInput) => PromptStudioOutput;
};
