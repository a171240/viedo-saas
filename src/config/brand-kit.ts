export type BrandKit = {
  enabled: boolean;
  brandTone: string;
  styleSuffix: string;
  bannedWords: string;
  defaultAspectRatio?: string;
  defaultDuration?: number;
};

export const BRAND_KIT_STORAGE_KEY = "videofly_brand_kit";

export const BRAND_KIT_DEFAULTS: BrandKit = {
  enabled: true,
  brandTone: "",
  styleSuffix: "",
  bannedWords: "",
  defaultAspectRatio: "",
  defaultDuration: undefined,
};

export const BRAND_KIT_RATIO_OPTIONS = ["16:9", "9:16", "1:1", "4:3", "3:4"];

export const BRAND_KIT_DURATION_OPTIONS = [5, 8, 10, 12, 15, 20, 30];

export const normalizeBrandKit = (input?: Partial<BrandKit> | null): BrandKit => {
  const merged = {
    ...BRAND_KIT_DEFAULTS,
    ...(input ?? {}),
  };

  return {
    enabled: Boolean(merged.enabled),
    brandTone: String(merged.brandTone ?? "").trim(),
    styleSuffix: String(merged.styleSuffix ?? "").trim(),
    bannedWords: String(merged.bannedWords ?? "").trim(),
    defaultAspectRatio: String(merged.defaultAspectRatio ?? "").trim(),
    defaultDuration: typeof merged.defaultDuration === "number" && merged.defaultDuration > 0
      ? merged.defaultDuration
      : undefined,
  };
};

export const parseBannedWords = (value?: string) =>
  String(value ?? "")
    .split(/[\n,，;；]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const applyBrandKitToPrompt = (prompt: string, brandKit: BrandKit, locale: "en" | "zh") => {
  if (!brandKit.enabled) return prompt;
  const trimmedPrompt = prompt.trim();
  const existingMarkers = ["Brand tone:", "Style suffix:", "Avoid words:", "品牌语气：", "风格补充：", "避免用词："];
  if (existingMarkers.some((marker) => trimmedPrompt.includes(marker))) {
    return trimmedPrompt;
  }
  const lines: string[] = [];
  if (brandKit.brandTone) {
    lines.push(locale === "zh" ? `品牌语气：${brandKit.brandTone}` : `Brand tone: ${brandKit.brandTone}`);
  }
  if (brandKit.styleSuffix) {
    lines.push(locale === "zh" ? `风格补充：${brandKit.styleSuffix}` : `Style suffix: ${brandKit.styleSuffix}`);
  }
  const banned = parseBannedWords(brandKit.bannedWords);
  if (banned.length > 0) {
    lines.push(locale === "zh" ? `避免用词：${banned.join("、")}` : `Avoid words: ${banned.join(", ")}`);
  }

  if (lines.length === 0) return prompt;
  return [trimmedPrompt, "", ...lines].filter(Boolean).join("\n");
};
