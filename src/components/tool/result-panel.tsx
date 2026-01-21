"use client";

import { useState, useEffect } from "react";
import { Play, Download, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/components/ui";
import type { Video } from "@/db";

interface ResultPanelProps {
  currentVideo?: Video | null;
  isGenerating?: boolean;
  generatingProgress?: number;
  onRegenerate?: () => void;
}

export function ResultPanel({
  currentVideo,
  isGenerating = false,
  generatingProgress = 0,
  onRegenerate,
}: ResultPanelProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (currentVideo?.videoUrl) {
      setVideoSrc(currentVideo.videoUrl);
    }
  }, [currentVideo]);

  // Empty state
  if (!isGenerating && !currentVideo) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Your creation will appear here</h3>
          <p className="text-muted-foreground text-sm">
            Configure the settings on the left and click Generate to create your video.
          </p>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
              style={{
                transform: `rotate(${generatingProgress * 3.6}deg)`,
              }}
            />
            <span className="text-sm font-medium">{generatingProgress}%</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Generating your video...</h3>
          <p className="text-muted-foreground text-sm">
            This may take 2-5 minutes. You can leave this page and come back later.
          </p>
        </div>
      </div>
    );
  }

  // Completed state
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        {/* Video Player */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {videoSrc ? (
            <video
              src={videoSrc}
              controls
              className="w-full h-full object-contain"
              poster={currentVideo?.thumbnailUrl || undefined}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Video Info */}
        {currentVideo && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Model: {currentVideo?.model || "N/A"}</span>
              <span>•</span>
              <span>{currentVideo?.duration || 0}s</span>
              {currentVideo?.aspectRatio && (
                <>
                  <span>•</span>
                  <span>{currentVideo.aspectRatio}</span>
                </>
              )}
            </div>

            <p className="text-sm text-foreground line-clamp-2">
              "{currentVideo?.prompt || ""}"
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={videoSrc || "#"}
                download
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  videoSrc
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Download className="h-4 w-4" />
                Download
              </a>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
