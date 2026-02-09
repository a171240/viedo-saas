/**
 * Demo Videos
 *
 * 空状态占位视频展示
 * - 单个示例视频
 */

import { useCallback, useRef } from "react";
import { Play } from "lucide-react";
import { cn } from "@/components/ui";

export function DemoVideos({ className }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startPreview = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const res = video.play();
    if (res && typeof (res as Promise<void>).catch === "function") {
      (res as Promise<void>).catch(() => {});
    }
  }, []);

  const stopPreview = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Some browsers can throw if metadata isn't loaded yet.
    }
  }, []);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "w-full max-w-lg aspect-video rounded-xl overflow-hidden border border-zinc-800 relative group cursor-pointer",
          "bg-gradient-to-br from-purple-500/20 to-blue-500/20"
        )}
        onPointerEnter={startPreview}
        onPointerLeave={stopPreview}
      >
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          src="/videos/showcase/product.mp4"
          poster="/images/showcase/product.jpg"
          muted
          loop
          playsInline
          preload="metadata"
        />

        {/* 播放图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 group-hover:scale-110 transition-transform">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>

        {/* 悬停遮罩 */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
