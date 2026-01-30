"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { UploadCloud, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToolLandingPage } from "@/components/tool/tool-landing-page";
import { productToVideoConfig } from "@/config/tool-pages/product-to-video.config";
import {
  PRODUCT_TO_VIDEO_DEFAULTS,
  PRODUCT_TO_VIDEO_PLATFORMS,
  PRODUCT_TO_VIDEO_STYLES,
  PRODUCT_TO_VIDEO_VARIATIONS,
  buildProductToVideoVariationPrompts,
  buildProductToVideoVariations,
  applyProductToVideoVariationNotes,
  type ProductToVideoPlatform,
  type ProductToVideoStyle,
} from "@/config/product-to-video";
import { getAvailableModels, getModelConfig, calculateModelCredits } from "@/config/credits";
import { applyBrandKitToPrompt } from "@/config/brand-kit";
import { uploadImage } from "@/lib/video-api";
import { authClient } from "@/lib/auth/client";
import { useBrandKit } from "@/hooks/use-brand-kit";
import { toast } from "sonner";
import PromptStudioDialog from "@/components/prompt-studio/prompt-studio-dialog";

type ImageItem = {
  file: File;
  previewUrl: string;
};

const TOOL_PREFILL_KEY = "videofly_tool_prefill";

export function ProductToVideoPage({ locale }: { locale: string }) {
  const t = useTranslations("ProductToVideo");
  const tTool = useTranslations("ToolPage");
  const tStudio = useTranslations("PromptStudio");
  const router = useRouter();
  const currentLocale = useLocale();
  const { brandKit } = useBrandKit();

  const [productName, setProductName] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const [platform, setPlatform] = useState<ProductToVideoPlatform>(
    PRODUCT_TO_VIDEO_DEFAULTS.platform
  );
  const [style, setStyle] = useState<ProductToVideoStyle>(
    PRODUCT_TO_VIDEO_DEFAULTS.style
  );
  const [variationCount, setVariationCount] = useState(
    PRODUCT_TO_VIDEO_DEFAULTS.variationCount
  );
  const [images, setImages] = useState<ImageItem[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [modelId, setModelId] = useState(PRODUCT_TO_VIDEO_DEFAULTS.model);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studioPromptOverride, setStudioPromptOverride] = useState<string | null>(null);
  const [studioSignature, setStudioSignature] = useState<string | null>(null);
  const [useBrandKitEnabled, setUseBrandKitEnabled] = useState(brandKit.enabled);
  const [brandDefaultsApplied, setBrandDefaultsApplied] = useState(false);
  const batchDisabled = isSubmitting || images.length < 1;
  const batchDisabledHint = isSubmitting
    ? tStudio("batch.disabledBusy")
    : (images.length < 1 ? tStudio("batch.disabledMissingImage") : undefined);
  const [lastResult, setLastResult] = useState<{
    videoUuid: string;
    creditsUsed: number;
  } | null>(null);

  const availableModels = useMemo(
    () => getAvailableModels().filter((model) => model.supportImageToVideo),
    []
  );

  useEffect(() => {
    setUseBrandKitEnabled(brandKit.enabled);
  }, [brandKit.enabled]);

  const platformConfig = PRODUCT_TO_VIDEO_PLATFORMS.find((p) => p.id === platform);
  const ratio = platformConfig?.ratio ?? "9:16";

  useEffect(() => {
    if (brandDefaultsApplied || !useBrandKitEnabled) return;
    const preferredRatio = brandKit.defaultAspectRatio;
    if (preferredRatio === "16:9" && platform !== "youtube") {
      setPlatform("youtube");
    } else if (preferredRatio === "9:16" && platform !== "tiktok") {
      setPlatform("tiktok");
    }
    if (preferredRatio) {
      setBrandDefaultsApplied(true);
    }
  }, [brandDefaultsApplied, brandKit.defaultAspectRatio, platform, useBrandKitEnabled]);

  const benefits = useMemo(
    () =>
      benefitsText
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    [benefitsText]
  );

  const modelConfig = useMemo(() => getModelConfig(modelId), [modelId]);
  const effectiveDuration = useMemo(() => {
    const desired = useBrandKitEnabled && brandKit.defaultDuration
      ? brandKit.defaultDuration
      : PRODUCT_TO_VIDEO_DEFAULTS.duration;
    if (modelConfig?.durations?.includes(desired)) return desired;
    return modelConfig?.durations?.[0] ?? desired;
  }, [brandKit.defaultDuration, modelConfig, useBrandKitEnabled]);

  const effectiveQuality = useMemo(() => {
    const desired = PRODUCT_TO_VIDEO_DEFAULTS.quality;
    if (modelConfig?.qualities?.includes(desired)) return desired;
    return modelConfig?.qualities?.[0];
  }, [modelConfig]);

  const effectiveRatio = useMemo(() => {
    if (modelConfig?.aspectRatios?.includes(ratio)) return ratio;
    return modelConfig?.aspectRatios?.[0] ?? ratio;
  }, [modelConfig, ratio]);

  const estimatedCredits = useMemo(() => {
    if (!modelId) return 0;
    const base = calculateModelCredits(modelId, {
      duration: effectiveDuration,
      quality: effectiveQuality,
    });
    return base * variationCount;
  }, [modelId, effectiveDuration, effectiveQuality, variationCount]);

  const computedPrompts = useMemo(() => {
    if (!productName || !targetAudience || benefits.length < 1) return [];
    return buildProductToVideoVariationPrompts(
      (currentLocale === "zh" ? "zh" : "en"),
      {
        productName,
        targetAudience,
        keyBenefits: benefits,
        platform,
        style,
        variationCount,
      },
      effectiveRatio
    );
  }, [productName, targetAudience, benefits, platform, style, variationCount, effectiveRatio, currentLocale]);

  const previewLocale = currentLocale === "zh" ? "zh" : "en";
  const promptPreviewBase = studioPromptOverride ?? computedPrompts[0] ?? "";
  const promptPreview = useBrandKitEnabled
    ? applyBrandKitToPrompt(promptPreviewBase, brandKit, previewLocale)
    : promptPreviewBase;

  const formSignature = useMemo(
    () => JSON.stringify({ productName, targetAudience, benefitsText, platform, style, variationCount }),
    [productName, targetAudience, benefitsText, platform, style, variationCount]
  );

  useEffect(() => {
    if (!studioPromptOverride) return;
    if (studioSignature && studioSignature !== formSignature) {
      setStudioPromptOverride(null);
      setStudioSignature(null);
    }
  }, [studioPromptOverride, studioSignature, formSignature]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(TOOL_PREFILL_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        prompt?: string;
        model?: string;
        aspectRatio?: string;
      };
      if (data.prompt) {
        setStudioPromptOverride(data.prompt);
        setStudioSignature(null);
      }
      if (data.model) {
        setModelId(data.model);
      }
      if (data.aspectRatio === "16:9") {
        setPlatform("youtube");
      } else if (data.aspectRatio === "9:16") {
        setPlatform("tiktok");
      }
      sessionStorage.removeItem(TOOL_PREFILL_KEY);
    } catch (error) {
      console.warn("Failed to read remix data:", error);
    }
  }, []);

  const handleImagesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const nextFiles = [...images];
    for (const file of files) {
      if (nextFiles.length >= 3) break;
      nextFiles.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (nextFiles.length > 3) {
      toast.error(t("validation.maxImages"));
    }

    setImages(nextFiles.slice(0, 3));
    event.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1);
      if (removed[0]) URL.revokeObjectURL(removed[0].previewUrl);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      toast.error(t("validation.productName"));
      return;
    }
    if (!targetAudience.trim()) {
      toast.error(t("validation.targetAudience"));
      return;
    }
    if (benefits.length < 3) {
      toast.error(t("validation.benefits"));
      return;
    }
    if (images.length < 1) {
      toast.error(t("validation.images"));
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        router.push(`/${locale}/login?from=/product-to-video`);
        return;
      }

      const imageUrls = await Promise.all(
        images.map((image) => uploadImage(image.file))
      );

      const baseInput = {
        productName: productName.trim(),
        targetAudience: targetAudience.trim(),
        keyBenefits: benefits,
        platform,
        style,
        variationCount,
      };
      const localeKey = currentLocale === "zh" ? "zh" : "en";
      const variationPrompts = buildProductToVideoVariationPrompts(localeKey, baseInput, effectiveRatio);
      const variationMeta = buildProductToVideoVariations(localeKey, baseInput);
      const promptsToQueue = studioPromptOverride
        ? variationMeta.map((variation) => applyProductToVideoVariationNotes(localeKey, studioPromptOverride, variation))
        : variationPrompts;
      const promptsWithBrandKit = useBrandKitEnabled
        ? promptsToQueue.map((prompt) => applyBrandKitToPrompt(prompt, brandKit, localeKey))
        : promptsToQueue;

      let lastQueued: { videoUuid: string; creditsUsed: number } | null = null;
      for (const prompt of promptsWithBrandKit) {
        const response = await fetch("/api/v1/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model: modelId,
            mode: "product-to-video",
            duration: effectiveDuration,
            aspectRatio: effectiveRatio,
            quality: effectiveQuality,
            outputNumber: 1,
            generateAudio: false,
            imageUrls,
            imageUrl: imageUrls[0],
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || tTool("toast.generationFailed"));
        }

        lastQueued = {
          videoUuid: data.data.videoUuid as string,
          creditsUsed: data.data.creditsUsed as number,
        };
      }

      toast.success(tTool("toast.batchQueued", { count: promptsWithBrandKit.length }));
      if (lastQueued) {
        setLastResult(lastQueued);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tTool("toast.generationFailed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchQueue = async (prompts: string[]) => {
    if (!prompts.length) return;
    if (images.length < 1) {
      toast.error(t("validation.images"));
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await authClient.getSession();
      if (!session?.data?.user) {
        router.push(`/${locale}/login?from=/product-to-video`);
        return;
      }

      const imageUrls = await Promise.all(
        images.map((image) => uploadImage(image.file))
      );
      const localeKey = currentLocale === "zh" ? "zh" : "en";
      const mergedPrompts = useBrandKitEnabled
        ? prompts.map((prompt) => applyBrandKitToPrompt(prompt, brandKit, localeKey))
        : prompts;

      let lastQueued: { videoUuid: string; creditsUsed: number } | null = null;
      for (const prompt of mergedPrompts) {
        const response = await fetch("/api/v1/video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model: modelId,
            mode: "product-to-video",
            duration: effectiveDuration,
            aspectRatio: effectiveRatio,
            quality: effectiveQuality,
            outputNumber: 1,
            generateAudio: false,
            imageUrls,
            imageUrl: imageUrls[0],
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error?.message || tTool("toast.generationFailed"));
        }

        lastQueued = {
          videoUuid: data.data.videoUuid as string,
          creditsUsed: data.data.creditsUsed as number,
        };
      }

      if (lastQueued) {
        setLastResult(lastQueued);
      }
      toast.success(tTool("toast.batchQueued", { count: mergedPrompts.length }));
    } catch (error) {
      const message = error instanceof Error ? error.message : tTool("toast.generationFailed");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl p-6 lg:p-8 space-y-8">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t("title")}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {t("description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <div>
                  <div className="text-xs font-medium">{t("brandKit.label")}</div>
                  <div className="text-[11px] text-muted-foreground">{t("brandKit.hint")}</div>
                </div>
                <Switch
                  checked={useBrandKitEnabled}
                  onCheckedChange={(checked) => setUseBrandKitEnabled(checked)}
                  aria-label={t("brandKit.label")}
                />
              </div>
              <PromptStudioDialog
                locale={currentLocale === "zh" ? "zh" : "en"}
                onApplyPrompt={(value) => {
                  setStudioPromptOverride(value);
                  setStudioSignature(formSignature);
                }}
                onBatchCreate={handleBatchQueue}
                batchDisabled={batchDisabled}
                batchDisabledHint={batchDisabledHint}
                trigger={(
                  <Button variant="outline" type="button">
                    {t("promptStudio")}
                  </Button>
                )}
              />
              <Button
                variant="outline"
                onClick={() => setShowAdvanced((prev) => !prev)}
                type="button"
              >
                {showAdvanced ? t("actions.hideAdvanced") : t("actions.showAdvanced")}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-4">
                <div className="space-y-2">
                  <Label>{t("form.productImages")}</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {images.map((image, index) => (
                      <div
                        key={image.previewUrl}
                        className="relative h-20 w-16 rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={image.previewUrl}
                          alt={t("form.productImages")}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 rounded-full bg-background p-1 shadow"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {images.length < 3 && (
                      <label className="flex h-20 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary">
                        <UploadCloud className="h-4 w-4" />
                        <span>{t("actions.addImages")}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImagesChange}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("hints.images")}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("form.productName")}</Label>
                    <Input
                      value={productName}
                      onChange={(event) => setProductName(event.target.value)}
                      placeholder={t("placeholders.productName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.targetAudience")}</Label>
                    <Input
                      value={targetAudience}
                      onChange={(event) => setTargetAudience(event.target.value)}
                      placeholder={t("placeholders.targetAudience")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("form.keyBenefits")}</Label>
                  <Textarea
                    value={benefitsText}
                    onChange={(event) => setBenefitsText(event.target.value)}
                    placeholder={t("placeholders.keyBenefits")}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("hints.benefits", { count: benefits.length })}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>{t("form.platform")}</Label>
                    <Select
                      value={platform}
                      onValueChange={(value) => setPlatform(value as ProductToVideoPlatform)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TO_VIDEO_PLATFORMS.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {t(`platforms.${item.id}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.style")}</Label>
                    <Select
                      value={style}
                      onValueChange={(value) => setStyle(value as ProductToVideoStyle)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TO_VIDEO_STYLES.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {t(`styles.${item.id}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("form.variationCount")}</Label>
                    <Select
                      value={variationCount.toString()}
                      onValueChange={(value) => setVariationCount(Number(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TO_VIDEO_VARIATIONS.map((count) => (
                          <SelectItem key={count} value={count.toString()}>
                            {t("variations.option", { count })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {showAdvanced && (
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("advanced.title")}</p>
                        <p className="text-xs text-muted-foreground">{t("advanced.subtitle")}</p>
                      </div>
                      <Switch
                        checked={showAdvanced}
                        onCheckedChange={setShowAdvanced}
                        aria-label={t("advanced.title")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("advanced.model")}</Label>
                      <Select value={modelId} onValueChange={setModelId}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3 text-xs text-muted-foreground">
                      <div>
                        <span className="block font-medium text-foreground">{t("advanced.aspectRatio")}</span>
                        {effectiveRatio}
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">{t("advanced.duration")}</span>
                        {effectiveDuration}s
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">{t("advanced.quality")}</span>
                        {effectiveQuality ?? t("advanced.auto")}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {t("estimatedCredits", { credits: estimatedCredits, count: variationCount })}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="min-w-[160px]"
                  >
                    {isSubmitting ? t("actions.generating") : t("actions.generate")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-3">
                <h2 className="text-sm font-semibold">{t("preview.title")}</h2>
                <Textarea
                  readOnly
                  value={promptPreview || t("preview.placeholder")}
                  rows={10}
                  className="text-xs text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  {t("preview.hint")}
                </p>
              </div>

              {lastResult && (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                  <p className="text-sm font-medium">{t("result.title")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("result.subtitle", {
                      credits: lastResult.creditsUsed,
                    })}
                  </p>
                  <Link
                    href={`/${locale}/my-creations`}
                    className="text-sm text-primary hover:underline"
                  >
                    {t("result.view")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <ToolLandingPage config={productToVideoConfig} locale={locale} />
      </div>
    </div>
  );
}
