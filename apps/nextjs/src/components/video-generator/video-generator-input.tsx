"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@videofly/ui";
import type { VideoModel, SubmitData, VideoGeneratorInputProps } from "./types";
import { calculateModelCredits } from "@videofly/common/config/credits";

const DEFAULT_MODELS: VideoModel[] = [
  {
    id: "sora-2",
    name: "Sora 2",
    description: "OpenAI's video generation model",
    creditCost: 15,
    supportImageToVideo: true,
    durations: [10, 15],
    aspectRatios: ["16:9", "9:16"],
  },
  {
    id: "sora-2-pro",
    name: "Sora 2 Pro",
    description: "Enhanced Sora model with better quality",
    creditCost: 18,
    supportImageToVideo: false,
    durations: [10, 15],
    aspectRatios: ["16:9", "9:16"],
    qualities: ["standard", "high"],
  },
];

export function VideoGeneratorInput({
  models = DEFAULT_MODELS,
  isLoading = false,
  disabled = false,
  onSubmit,
}: VideoGeneratorInputProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(models[0]?.id || "sora-2");
  const [duration, setDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [quality, setQuality] = useState<string>("standard");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const currentModel = useMemo(
    () => models.find((m) => m.id === selectedModel) || models[0],
    [models, selectedModel]
  );

  const estimatedCredits = useMemo(() => {
    return calculateModelCredits(selectedModel, {
      duration,
      quality: currentModel?.qualities?.includes(quality) ? quality : undefined,
    });
  }, [selectedModel, duration, quality, currentModel]);

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isLoading || disabled) return;

    const data: SubmitData = {
      type: "video",
      prompt: prompt.trim(),
      model: selectedModel,
      aspectRatio,
      duration: `${duration}s`,
      quality: currentModel?.qualities?.includes(quality) ? quality : undefined,
      images: imageFile ? [imageFile] : undefined,
      estimatedCredits,
    };

    onSubmit(data);
  }, [
    prompt,
    selectedModel,
    aspectRatio,
    duration,
    quality,
    imageFile,
    estimatedCredits,
    isLoading,
    disabled,
    onSubmit,
    currentModel,
  ]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 p-6 bg-card rounded-xl border">
      {/* Prompt Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to generate..."
          className="w-full min-h-[120px] p-3 rounded-lg border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={disabled || isLoading}
        />
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Model</label>
        <div className="grid grid-cols-2 gap-3">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => setSelectedModel(model.id)}
              disabled={disabled || isLoading}
              className={cn(
                "p-4 rounded-lg border text-left transition-all",
                selectedModel === model.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="font-medium">{model.name}</div>
              {model.description && (
                <div className="text-sm text-muted-foreground mt-1">
                  {model.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                ~{model.creditCost} credits
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration Selection */}
      {currentModel?.durations && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Duration</label>
          <div className="flex gap-2">
            {currentModel.durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                disabled={disabled || isLoading}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-all",
                  duration === d
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aspect Ratio Selection */}
      {currentModel?.aspectRatios && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Aspect Ratio</label>
          <div className="flex gap-2">
            {currentModel.aspectRatios.map((ar) => (
              <button
                key={ar}
                type="button"
                onClick={() => setAspectRatio(ar)}
                disabled={disabled || isLoading}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-all",
                  aspectRatio === ar
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                {ar}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality Selection (for models that support it) */}
      {currentModel?.qualities && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Quality</label>
          <div className="flex gap-2">
            {currentModel.qualities.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuality(q)}
                disabled={disabled || isLoading}
                className={cn(
                  "px-4 py-2 rounded-lg border transition-all capitalize",
                  quality === q
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload (for models that support it) */}
      {currentModel?.supportImageToVideo && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Reference Image (Optional)
          </label>
          {imageFile ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
              <span className="text-sm truncate flex-1">{imageFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-sm text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
              <span className="text-sm text-muted-foreground">
                Click to upload image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={disabled || isLoading}
              />
            </label>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Estimated cost:{" "}
          <span className="font-medium text-foreground">
            {estimatedCredits} credits
          </span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isLoading || !prompt.trim()}
          className={cn(
            "px-6 py-2.5 rounded-lg font-medium transition-all",
            disabled || isLoading || !prompt.trim()
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isLoading ? "Generating..." : "Generate Video"}
        </button>
      </div>
    </div>
  );
}

export default VideoGeneratorInput;
