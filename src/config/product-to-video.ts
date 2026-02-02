import { getPromptStudioTemplate } from "./prompt-studio";

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

export type ProductToVideoVariation = {
  angle: string;
  style: string;
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

const STYLE_LABELS: Record<ProductToVideoStyle, string> = {
  ugc: "UGC",
  luxury: "Luxury",
  minimal: "Minimal",
  tech: "Tech",
  cute: "Cute",
};

const PLATFORM_LABELS: Record<ProductToVideoPlatform, string> = {
  tiktok: "TikTok/Reels/Shorts (9:16)",
  youtube: "YouTube (16:9)",
};

const DEFAULT_CTA: Record<ProductToVideoLocale, string> = {
  en: "Shop now",
  zh: "立即购买",
};

const STYLE_VARIANTS_EN: Record<ProductToVideoStyle, string[]> = {
  ugc: [
    "UGC handheld, natural light",
    "UGC cozy home vibe",
    "UGC street-style quick cuts",
    "UGC authentic demo, minimal polish",
  ],
  luxury: [
    "Luxury studio lighting, glossy finish",
    "Luxury cinematic slow motion",
    "Luxury minimal, high-end textures",
    "Luxury premium unboxing vibe",
  ],
  minimal: [
    "Minimal clean studio, soft shadows",
    "Minimal monochrome palette",
    "Minimal flat-lay and top-down shots",
    "Minimal calm pacing, airy mood",
  ],
  tech: [
    "Tech UI-inspired, crisp highlights",
    "Tech neon accents, sleek surfaces",
    "Tech futuristic lighting, clean motion",
    "Tech product demo, sharp focus",
  ],
  cute: [
    "Cute pastel palette, soft lighting",
    "Cute playful props, cozy mood",
    "Cute bouncy motion, bright colors",
    "Cute cheerful lifestyle vibe",
  ],
};

const STYLE_VARIANTS_ZH: Record<ProductToVideoStyle, string[]> = {
  ugc: [
    "UGC 手持感，自然光",
    "UGC 居家氛围",
    "UGC 街头快切",
    "UGC 真实开箱，少滤镜",
  ],
  luxury: [
    "奢华棚拍灯光，质感高光",
    "奢华电影质感，慢动作",
    "奢华极简，高端材质",
    "奢华开箱氛围，精致感",
  ],
  minimal: [
    "极简棚拍，柔光阴影",
    "极简黑白/单色",
    "极简俯拍/平铺",
    "极简节奏，干净留白",
  ],
  tech: [
    "科技感 UI 氛围，锐利高光",
    "科技霓虹点缀，冷感材质",
    "科技未来感灯光，干净镜头",
    "科技产品演示，清晰聚焦",
  ],
  cute: [
    "可爱粉彩，柔光氛围",
    "可爱道具点缀，温馨感",
    "可爱弹跳节奏，亮色系",
    "可爱生活化场景，治愈感",
  ],
};

const buildAngles = (locale: ProductToVideoLocale, input: ProductToVideoInput) => {
  const [b1, b2, b3] = input.keyBenefits;
  if (locale === "zh") {
    return [
      `别划走！${input.productName} 专为 ${input.targetAudience}`,
      `3 个理由：${input.targetAudience} 喜欢 ${input.productName}`,
      `痛点前后对比：${b1 ?? "核心卖点"}`,
      `POV：发现 ${input.productName} 后生活改变`,
      `开箱 + 第一印象 + ${b2 ?? "亮点"}`,
      `对比：${input.productName} vs 传统方案`,
      `快速演示：${b3 ?? "效果展示"}`,
      `FAQ：${input.productName} 适合 ${input.targetAudience} 吗？`,
      `限时推荐：${b1 ?? "核心卖点"} 现在入手`,
      `日常使用：${input.targetAudience} 的真实场景`,
      `测评挑战：${input.productName} 能做到什么？`,
      `升级搭配：${input.productName} + X 更强`,
      `省心省时：${input.productName} 帮你解决什么`,
      `Before/After：使用前后对比`,
      `1 分钟快速种草：${input.productName}`,
      `真实反馈：大家都在夸 ${b1 ?? "卖点"}`,
    ];
  }

  return [
    `Stop scrolling: ${input.productName} for ${input.targetAudience}`,
    `3 reasons ${input.targetAudience} loves ${input.productName}`,
    `Before/After: ${b1 ?? "a key benefit"}`,
    `POV: discovering ${input.productName} changes the routine`,
    `Unboxing + first impression + ${b2 ?? "highlight"}`,
    `Compare: ${input.productName} vs alternatives`,
    `Quick demo: ${b3 ?? "key result"}`,
    `FAQ: does ${input.productName} work for ${input.targetAudience}?`,
    `Limited offer: ${b1 ?? "top benefit"} today`,
    `${input.targetAudience}'s daily use-case`,
    `Challenge test: what ${input.productName} can do`,
    `Upgrade your setup with ${input.productName}`,
    `Save time with ${input.productName}`,
    `Before/After transformation story`,
    `1-minute product hype: ${input.productName}`,
    `Social proof: people love ${b1 ?? "the benefit"}`,
  ];
};

export function buildProductToVideoVariations(
  locale: ProductToVideoLocale,
  input: ProductToVideoInput,
): ProductToVideoVariation[] {
  const count = Math.max(1, input.variationCount || 1);
  const angles = buildAngles(locale, input);
  const styleVariants = locale === "zh" ? STYLE_VARIANTS_ZH[input.style] : STYLE_VARIANTS_EN[input.style];
  const variations: ProductToVideoVariation[] = [];
  for (let i = 0; i < count; i += 1) {
    variations.push({
      angle: angles[i % angles.length],
      style: styleVariants[i % styleVariants.length],
    });
  }
  return variations;
}

export function buildProductToVideoPrompt(
  locale: ProductToVideoLocale,
  input: ProductToVideoInput,
  ratio: string,
  variation?: ProductToVideoVariation,
) {
  const promptTemplate = getPromptStudioTemplate(locale, "product_ads_hvc_v1");
  if (promptTemplate) {
    const basePrompt = promptTemplate.build({
      productName: input.productName,
      targetAudience: input.targetAudience,
      benefits: input.keyBenefits,
      platform: PLATFORM_LABELS[input.platform],
      style: STYLE_LABELS[input.style],
      cta: DEFAULT_CTA[locale],
    }).videoPrompt;

    return variation
      ? applyProductToVideoVariationNotes(locale, basePrompt, variation)
      : basePrompt;
  }

  const benefits = input.keyBenefits.slice(0, 5);
  const benefitsText = benefits.length > 0 ? benefits.join(", ") : "";
  const styleLabel = variation?.style ?? input.style.toUpperCase();
  const angleLine = variation?.angle
    ? locale === "zh"
      ? `角度/钩子：${variation.angle}。`
      : `Angle/Hook: ${variation.angle}.`
    : "";

  if (locale === "zh") {
    return [
      `为「${input.productName}」生成一条 ${ratio} 商品广告短视频，目标受众为 ${input.targetAudience}。`,
      `风格：${styleLabel}。平台：${
        input.platform === "youtube" ? "YouTube" : "TikTok/Reels/Shorts"
      }。`,
      angleLine,
      benefitsText ? `核心卖点：${benefitsText}。` : "突出 3-5 个核心卖点。",
      "结构：Hook -> Value -> Proof -> CTA。",
      "分镜建议：",
      `1) 0-2s：产品特写 + 强吸引开场画面${variation?.angle ? `（${variation.angle}）` : ""}。`,
      "2) 2-6s：痛点场景 -> 产品解决方案。",
      "3) 6-10s：卖点快速展示（最多 3 个）。",
      "4) 10-13s：使用场景，真实手部操作。",
      "5) 13-15s：干净收尾画面，品牌感强。",
      "不要把文字直接渲染在视频里，保持画面干净。",
      "确保产品外观一致、镜头稳定、过渡自然。",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Create a ${ratio} product ad video for "${input.productName}" targeting ${input.targetAudience}.`,
    `Style: ${styleLabel}. Platform: ${
      input.platform === "youtube" ? "YouTube" : "TikTok/Reels/Shorts"
    }.`,
    angleLine,
    benefitsText ? `Key benefits: ${benefitsText}.` : "Highlight 3-5 key benefits.",
    "Structure: Hook -> Value -> Proof -> CTA.",
    "Storyboard:",
    `1) 0-2s: Hero close-up of the product with a strong visual hook${variation?.angle ? ` (${variation.angle})` : ""}.`,
    "2) 2-6s: Show the pain point, then reveal the solution.",
    "3) 6-10s: Rapid benefit highlights (max 3).",
    "4) 10-13s: Lifestyle usage with natural hand interaction.",
    "5) 13-15s: Clean end frame, strong brand vibe.",
    "Do NOT render subtitles or text inside the video.",
    "Keep product appearance consistent, smooth motion, clean transitions.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildProductToVideoVariationPrompts(
  locale: ProductToVideoLocale,
  input: ProductToVideoInput,
  ratio: string,
) {
  const variations = buildProductToVideoVariations(locale, input);
  return variations.map((variation) => buildProductToVideoPrompt(locale, input, ratio, variation));
}

export function applyProductToVideoVariationNotes(
  locale: ProductToVideoLocale,
  basePrompt: string,
  variation: ProductToVideoVariation,
) {
  const angleLabel = locale === "zh" ? "\u53d8\u4f53\u89d2\u5ea6\uff1a" : "Variation angle: ";
  const styleLabel = locale === "zh" ? "\u98ce\u683c\u63d0\u793a\uff1a" : "Style note: ";
  return [basePrompt, "", `${angleLabel}${variation.angle}`, `${styleLabel}${variation.style}`]
    .filter(Boolean)
    .join("\n");
}
