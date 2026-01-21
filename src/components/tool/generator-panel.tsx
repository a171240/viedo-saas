"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/components/ui";
import { getAvailableModels, calculateModelCredits } from "@/config/credits";
import { ChevronDown, Upload, X, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GeneratorPanelProps {
  toolType: "image-to-video" | "text-to-video" | "reference-to-video";
  isLoading?: boolean;
  onSubmit?: (data: GeneratorData) => void;
}

export interface GeneratorData {
  toolType: string;
  model: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  quality?: string;
  imageFile?: File;
  estimatedCredits: number;
}

export function GeneratorPanel({
  toolType,
  isLoading = false,
  onSubmit,
}: GeneratorPanelProps) {
  const models = getAvailableModels();
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(models[0]?.id || "");
  const [duration, setDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [quality, setQuality] = useState("standard");
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Filter models based on tool type
  const availableModels = useMemo(() => {
    if (toolType === "image-to-video") {
      return models.filter((m) => m.supportImageToVideo);
    }
    return models;
  }, [toolType, models]);

  const currentModel = useMemo(
    () => models.find((m) => m.id === selectedModel) || availableModels[0],
    [models, selectedModel, availableModels]
  );

  const estimatedCredits = useMemo(() => {
    if (!selectedModel) return 0;
    return calculateModelCredits(selectedModel, {
      duration,
      quality: currentModel?.qualities?.includes(quality) ? quality : undefined,
    });
  }, [selectedModel, duration, quality, currentModel]);

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || isLoading) return;

    const data: GeneratorData = {
      toolType,
      model: selectedModel,
      prompt: prompt.trim(),
      duration,
      aspectRatio,
      quality: currentModel?.qualities?.includes(quality) ? quality : undefined,
      imageFile: imageFile || undefined,
      estimatedCredits,
    };

    onSubmit?.(data);
  }, [
    prompt,
    selectedModel,
    duration,
    aspectRatio,
    quality,
    imageFile,
    estimatedCredits,
    isLoading,
    toolType,
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

  const canSubmit = prompt.trim().length > 0 && !isLoading;

  return (
    <div className="h-full flex flex-col bg-background rounded-2xl border border-border shadow-xl shadow-zinc-200/20 overflow-hidden transition-all duration-300">
      {/* Page Title */}
      <div className="px-5 py-4 border-b border-border/50 bg-zinc-50/50">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          {toolType.replace(/-/g, " ")}
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 custom-scrollbar">
        {/* Model Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Model</label>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isLoading}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-zinc-300 transition-all text-sm group"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-medium">{currentModel?.name || "Select Model"}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px] rounded-xl p-1 shadow-2xl">
              {availableModels.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 cursor-pointer",
                    selectedModel === model.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <span className="font-semibold text-sm">{model.name}</span>
                  <div className="flex items-center gap-2 text-[10px] opacity-70">
                    <span className="uppercase tracking-wider">{model.provider === "evolink" ? "Evolink" : "Kie"}</span>
                    <span>•</span>
                    <span>{model.supportImageToVideo ? "High Quality" : "Standard"}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Image Upload (for image-to-video) */}
        {(toolType === "image-to-video" || toolType === "reference-to-video") &&
          currentModel?.supportImageToVideo && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-tight">
                {toolType === "reference-to-video" ? "Reference Video" : "Image Source"}
              </label>
              {imageFile ? (
                <div className="relative group aspect-video rounded-xl bg-muted/30 border border-zinc-200 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center p-3">
                    <span className="text-xs font-medium truncate bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
                      {imageFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-zinc-200 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group">
                  <div className="p-3 rounded-full bg-zinc-50 group-hover:bg-primary/10 transition-colors mb-2">
                    <Upload className="h-5 w-5 text-zinc-400 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600">
                    Upload image
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">
                    JPG, PNG, WEBP • Max 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              )}
            </div>
          )}

        {/* Prompt Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Prompt</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Prompt Enhancement</span>
              {/* Toggle Switch Mockup */}
              <div className="w-9 h-5 rounded-full bg-muted border border-border relative cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                <div className="absolute left-1 top-1 w-3 h-3 rounded-full bg-muted-foreground/50" />
              </div>
            </div>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create, e.g., A cat playing in a sunny garden with natural lighting and fresh atmosphere..."
              className="w-full min-h-[140px] p-4 text-sm rounded-lg border border-border bg-muted/20 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all leading-relaxed placeholder:text-muted-foreground/60"
              disabled={isLoading}
              maxLength={2000}
            />
          </div>
        </div>

        {/* Settings Group */}
        <div className="space-y-6 pt-2">
          {/* Ratio */}
          {currentModel?.aspectRatios && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-4">
                {currentModel.aspectRatios.map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAspectRatio(ar)}
                    disabled={isLoading}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all relative overflow-hidden",
                      aspectRatio === ar
                        ? "border-[#6366f1] bg-[#6366f1]/10 text-foreground"
                        : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {ar === "16:9" ? (
                      <div className={cn("w-8 h-5 border-2 rounded-sm", aspectRatio === ar ? "border-[#6366f1]" : "border-current")} />
                    ) : ar === "9:16" ? (
                      <div className={cn("w-5 h-8 border-2 rounded-sm", aspectRatio === ar ? "border-[#6366f1]" : "border-current")} />
                    ) : (
                      <div className={cn("w-6 h-6 border-2 rounded-sm", aspectRatio === ar ? "border-[#6366f1]" : "border-current")} />
                    )}
                    <span className="text-sm font-medium">{ar}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            {currentModel?.durations && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Video Length</label>
                <div className="flex bg-muted/20 p-1 rounded-lg border border-border/50">
                  {currentModel.durations.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      disabled={isLoading}
                      className={cn(
                        "flex-1 py-2 rounded-md text-sm font-medium transition-all",
                        duration === d
                          ? "bg-muted text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground/80"
                      )}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quality (Resolution) */}
            {currentModel?.qualities && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Resolution</label>
                <div className="flex bg-muted/20 p-1 rounded-lg border border-border/50">
                  {currentModel.qualities.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      disabled={isLoading}
                      className={cn(
                        "flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize",
                        quality === q
                          ? "bg-muted text-foreground shadow-sm border border-border/50"
                          : "text-muted-foreground hover:text-foreground/80"
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Section - Credits + Generate Button */}
      <div className="px-5 py-5 bg-background/80 border-t border-border/50 space-y-4 backdrop-blur-sm">
        {/* Credits Display */}
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
          <span className="text-muted-foreground">Total Credits:</span>
          <div className="flex items-center gap-1.5 text-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span>{estimatedCredits} Credits</span>
          </div>
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98]",
            canSubmit
              ? "bg-[#6366f1] hover:bg-[#5558e6] text-white shadow-indigo-500/25"
              : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
          )}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{isLoading ? "Generating..." : "Generate Video"}</span>
        </button>
      </div>
    </div>
  );
}
