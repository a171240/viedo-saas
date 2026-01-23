"use client";

/**
 * Generator Panel Component - Pollo.ai Style
 *
 * Tool page generator panel with dark theme design
 * Design inspired by https://pollo.ai
 * - Dark theme (#1A1A1A background)
 * - Uppercase labels for sections
 * - Purple accent color (#6D28D9)
 * - Dashed border upload area
 */

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/components/ui";
import { getAvailableModels, calculateModelCredits } from "@/config/credits";
import { ChevronDown, Upload, X, Sparkles, Image as ImageIcon, Volume2, Wand2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Types
// ============================================================================

interface SectionLabelProps {
  children: React.ReactNode;
  required?: boolean;
}

function SectionLabel({ children, required }: SectionLabelProps) {
  return (
    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wide mb-2 block">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

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

  // Get page title
  const getPageTitle = () => {
    if (toolType === "image-to-video") return "IMAGE TO VIDEO";
    if (toolType === "text-to-video") return "TEXT TO VIDEO";
    if (toolType === "reference-to-video") return "REFERENCE TO VIDEO";
    return "AI GENERATOR";
  };

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden">
      {/* Main Card - Pollo.ai Style */}
      <div className="flex-1 flex flex-col rounded-xl bg-[#1A1A1A] border border-zinc-800 overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-3 bg-zinc-900/50 border-b border-zinc-800 shrink-0">
          <h2 className="text-sm text-zinc-400 font-medium uppercase tracking-wide">
            {getPageTitle()}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Model Selection */}
          <div>
            <SectionLabel>MODEL</SectionLabel>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isLoading}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-white font-medium">
                    {currentModel?.name || "Select Model"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-[#1A1A1A] border-zinc-800 w-[300px] max-h-[320px] overflow-y-auto"
              >
                <DropdownMenuLabel className="text-zinc-400 text-xs uppercase tracking-wide">
                  Video Models
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {availableModels.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className="text-white hover:bg-zinc-800 py-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          selectedModel === model.id ? "bg-purple-500" : "bg-zinc-600"
                        )} />
                        <span className="font-medium">{model.name}</span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 ml-5">
                      {model.provider === "evolink" ? "Evolink" : "Kie"} • {model.supportImageToVideo ? "High Quality" : "Standard"}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Image Upload (for image-to-video) */}
          {(toolType === "image-to-video" || toolType === "reference-to-video") &&
            currentModel?.supportImageToVideo && (
              <div>
                <SectionLabel required={toolType === "image-to-video"}>
                  {toolType === "reference-to-video" ? "REFERENCE VIDEO" : "IMAGE SOURCE"}
                </SectionLabel>
                {imageFile ? (
                  <div className="relative group aspect-video rounded-lg overflow-hidden border-2 border-zinc-700">
                    <div className="absolute inset-0 flex items-center justify-center p-3">
                      <span className="text-xs font-medium truncate bg-zinc-900/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-zinc-700">
                        {imageFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full aspect-video rounded-lg border-2 border-dashed border-zinc-700 hover:border-purple-500/50 cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-800 group-hover:bg-zinc-700 transition-colors">
                      <ImageIcon className="w-6 h-6 text-zinc-500 group-hover:text-purple-400" />
                    </div>
                    <p className="text-sm text-zinc-400 mt-3">Upload image</p>
                    <p className="text-xs text-zinc-600 mt-1">JPG, PNG, WEBP • Max 10MB</p>
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

          {/* Prompt Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel className="mb-0">PROMPT</SectionLabel>
              <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
                <Wand2 className="w-3 h-3" />
                <span>Enhance</span>
                <div className="w-8 h-4 rounded-full p-0.5 bg-zinc-700 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-white/50" />
                </div>
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create, e.g., A cat playing in a sunny garden with natural lighting and fresh atmosphere..."
              disabled={isLoading}
              className="w-full min-h-[100px] max-h-[200px] px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-purple-500 transition-colors text-sm leading-relaxed"
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Settings Group */}
          <div className="space-y-5">
            {/* Aspect Ratio */}
            {currentModel?.aspectRatios && (
              <div>
                <SectionLabel>ASPECT RATIO</SectionLabel>
                <div className="flex gap-3">
                  {currentModel.aspectRatios.map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setAspectRatio(ar)}
                      disabled={isLoading}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        aspectRatio === ar
                          ? "bg-purple-600/20 text-purple-400 border-2 border-purple-500"
                          : "bg-zinc-900 text-zinc-400 border-2 border-zinc-800 hover:border-zinc-700"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "border-2 rounded-sm",
                          aspectRatio === ar ? "border-purple-400" : "border-zinc-600",
                          ar === "16:9" && "w-8 h-4",
                          ar === "9:16" && "w-4 h-8",
                          ar === "1:1" && "w-6 h-6",
                          ar === "4:3" && "w-6 h-4",
                          ar === "3:4" && "w-4 h-6"
                        )} />
                        <span>{ar}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration & Quality */}
            <div className="grid grid-cols-2 gap-3">
              {currentModel?.durations && (
                <div>
                  <SectionLabel>VIDEO LENGTH</SectionLabel>
                  <div className="flex gap-2">
                    {currentModel.durations.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        disabled={isLoading}
                        className={cn(
                          "flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          duration === d
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                        )}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentModel?.qualities && (
                <div>
                  <SectionLabel>RESOLUTION</SectionLabel>
                  <div className="flex gap-2">
                    {currentModel.qualities.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuality(q)}
                        disabled={isLoading}
                        className={cn(
                          "flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all capitalize",
                          quality === q
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
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
        <div className="px-5 py-4 bg-zinc-900/50 border-t border-zinc-800 space-y-4 shrink-0">
          {/* Credits Display */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Total Credits:</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-white font-medium">{estimatedCredits} Credits</span>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              canSubmit
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Video
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
