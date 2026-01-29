export type ProductToVideoPlatform = "tiktok" | "youtube";
export type ProductToVideoStyle = "ugc" | "luxury" | "minimal" | "tech" | "cute";

export type ProductToVideoInput = {
  productName: string;
  targetAudience: string;
  keyBenefits: string[];
  platform: ProductToVideoPlatform;
  style: ProductToVideoStyle;
  variationCount: number;
};

export type ProductToVideoLocale = "en" | "zh";

export const PRODUCT_TO_VIDEO_DEFAULTS = {
  platform: "tiktok" as ProductToVideoPlatform,
  style: "ugc" as ProductToVideoStyle,
  variationCount: 3,
  model: "wan2.6",
  duration: 10,
  quality: "1080P",
};

export const PRODUCT_TO_VIDEO_PLATFORMS = [
  {
    id: "tiktok" as const,
    ratio: "9:16",
  },
  {
    id: "youtube" as const,
    ratio: "16:9",
  },
];

export const PRODUCT_TO_VIDEO_STYLES = [
  { id: "ugc" as const },
  { id: "luxury" as const },
  { id: "minimal" as const },
  { id: "tech" as const },
  { id: "cute" as const },
];

export const PRODUCT_TO_VIDEO_VARIATIONS = [3, 5, 10];

export function buildProductToVideoPrompt(
  locale: ProductToVideoLocale,
  input: ProductToVideoInput,
  ratio: string
) {
  const benefits = input.keyBenefits.slice(0, 5);
  const benefitsText = benefits.length > 0 ? benefits.join(", ") : "";

  if (locale === "zh") {
    return [
      `为「${input.productName}」生成一条 ${ratio} 商品广告短视频，目标受众为 ${input.targetAudience}。`,
      `风格：${input.style.toUpperCase()}。平台：${
        input.platform === "youtube" ? "YouTube" : "TikTok/Reels/Shorts"
      }。`,
      benefitsText ? `核心卖点：${benefitsText}。` : "突出 3-5 个核心卖点。",
      "结构：Hook -> Value -> Proof -> CTA。",
      "分镜建议：",
      "1) 0-2s：产品特写 + 强吸引开场画面。",
      "2) 2-6s：痛点场景 -> 产品解决方案。",
      "3) 6-10s：卖点快速展示（最多 3 个）。",
      "4) 10-13s：使用场景，真实手部操作。",
      "5) 13-15s：干净收尾画面，品牌感强。",
      "不要把文字直接渲染在视频里，保持画面干净。",
      "确保产品外观一致、镜头稳定、过渡自然。",
    ].join("\n");
  }

  return [
    `Create a ${ratio} product ad video for "${input.productName}" targeting ${input.targetAudience}.`,
    `Style: ${input.style.toUpperCase()}. Platform: ${
      input.platform === "youtube" ? "YouTube" : "TikTok/Reels/Shorts"
    }.`,
    benefitsText ? `Key benefits: ${benefitsText}.` : "Highlight 3-5 key benefits.",
    "Structure: Hook -> Value -> Proof -> CTA.",
    "Storyboard:",
    "1) 0-2s: Hero close-up of the product with a strong visual hook.",
    "2) 2-6s: Show the pain point, then reveal the solution.",
    "3) 6-10s: Rapid benefit highlights (max 3).",
    "4) 10-13s: Lifestyle usage with natural hand interaction.",
    "5) 13-15s: Clean end frame, strong brand vibe.",
    "Do NOT render subtitles or text inside the video.",
    "Keep product appearance consistent, smooth motion, clean transitions.",
  ].join("\n");
}
