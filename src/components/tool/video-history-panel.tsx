/**
 * Video History Panel
 *
 * 视频历史记录面板组件
 * - 显示最近 20 条视频记录
 * - 按时间排序：最旧的在最上面，最新的在最下面
 * - 空状态：显示示例视频占位
 * - 替代现有的 ResultPanel
 */

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/components/ui";
import { VideoHistoryCard } from "./video-history-card";
import { DemoVideos } from "./demo-videos";
import type { VideoHistoryItem } from "@/lib/video-history-storage";

interface VideoHistoryPanelProps {
  historyItems: VideoHistoryItem[];
  generatingIds?: string[];
  onDelete?: (uuid: string) => void;
  className?: string;
}

export function VideoHistoryPanel({
  historyItems,
  generatingIds = [],
  onDelete,
  className,
}: VideoHistoryPanelProps) {
  const t = useTranslations("VideoHistory");

  // 合并历史记录和生成中的 ID
  // 注意：historyItems 已经包含了所有记录（包括生成中的）
  // generatingIds 只是用于标识哪些正在生成中

  const hasItems = historyItems.length > 0;

  return (
    <div
      className={cn(
        "h-full w-full rounded-2xl border border-zinc-800 bg-zinc-900/70 overflow-hidden flex flex-col",
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="h-4 w-4 text-purple-500" />
          {hasItems ? t("title") : t("demoTitle")}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasItems ? (
          // 空状态：显示示例视频
          <div className="h-full flex flex-col justify-center">
            <DemoVideos />
          </div>
        ) : (
          // 有历史记录：显示列表
          <div className="space-y-4">
            {historyItems.map((video) => {
              const isGenerating = generatingIds.includes(video.uuid);
              return (
                <VideoHistoryCard
                  key={video.uuid}
                  video={video}
                  isGenerating={isGenerating}
                  onDelete={() => onDelete?.(video.uuid)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
