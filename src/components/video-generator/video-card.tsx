"use client";

import { cn } from "@/components/ui";

interface Video {
  uuid: string;
  prompt: string;
  model: string;
  status: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  created_at: string | Date;
  credits_used: number;
}

interface VideoCardProps {
  video: Video;
  onDelete?: () => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const statusConfig = {
    PENDING: { label: "Pending", color: "text-yellow-500" },
    GENERATING: { label: "Generating", color: "text-blue-500" },
    UPLOADING: { label: "Uploading", color: "text-purple-500" },
    COMPLETED: { label: "Completed", color: "text-green-500" },
    FAILED: { label: "Failed", color: "text-red-500" },
  };

  const config = statusConfig[video.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const createdAt = new Date(video.created_at).toLocaleDateString();

  return (
    <div className="bg-card rounded-xl border overflow-hidden group">
      {/* Thumbnail / Video Preview */}
      <div className="aspect-video bg-muted relative">
        {video.status === "COMPLETED" && video.video_url ? (
          <video
            src={video.video_url}
            className="w-full h-full object-cover"
            muted
            loop
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.prompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className={cn("text-sm font-medium", config.color)}>
              {config.label}
            </span>
          </div>
        )}

        {/* Overlay on hover */}
        {video.status === "COMPLETED" && video.video_url && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <a
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white text-black hover:bg-white/90"
            >
              View
            </a>
            <a
              href={video.video_url}
              download
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Download
            </a>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <p className="text-sm line-clamp-2" title={video.prompt}>
          {video.prompt}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{video.model}</span>
          <span>{video.credits_used} credits</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{createdAt}</span>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
