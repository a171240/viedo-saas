"use client";

import { Play, Download, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/components/ui";
import type { Video } from "@/db";

interface ResultPanelProps {
  currentVideos?: Video[];
  generatingIds?: string[];
  onRegenerate?: () => void;
  className?: string;
}

export function ResultPanel({
  currentVideos = [],
  generatingIds = [],
  onRegenerate,
  className,
}: ResultPanelProps) {
  const hasItems = currentVideos.length > 0 || generatingIds.length > 0;

  // Empty state
  if (!hasItems) {
    return (
      <div className={cn("h-full flex items-center justify-center p-6", className)}>
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

  return (
    <div className={cn("h-full flex flex-col p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-muted-foreground">
          Results
        </div>
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            New Generation
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {generatingIds.map((videoId) => (
          <div
            key={`generating-${videoId}`}
            className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Generating
              </span>
              <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            <div className="pt-6 text-sm text-muted-foreground">
              This video is being generated. You can start another task meanwhile.
            </div>
          </div>
        ))}

        {currentVideos.map((video) => {
          const videoSrc = video.videoUrl || "";
          return (
            <div
              key={video.uuid}
              className="rounded-lg border border-border bg-background overflow-hidden flex flex-col"
            >
              <div className="relative aspect-video bg-black">
                {videoSrc ? (
                  <video
                    src={videoSrc}
                    controls
                    className="w-full h-full object-contain"
                    poster={video.thumbnailUrl || undefined}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Model: {video.model || "N/A"}</span>
                  <span>•</span>
                  <span>{video.duration || 0}s</span>
                  {video.aspectRatio && (
                    <>
                      <span>•</span>
                      <span>{video.aspectRatio}</span>
                    </>
                  )}
                </div>

                <p className="text-sm text-foreground line-clamp-2">
                  "{video.prompt || ""}"
                </p>

                <div className="flex items-center gap-2">
                  <a
                    href={videoSrc || "#"}
                    download
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      videoSrc
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
