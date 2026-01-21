/**
 * ResultPanelWrapper Component
 *
 * 结果面板容器组件，用于已登录用户
 *
 * 功能：
 * - 显示视频生成进度
 * - 显示生成的视频结果
 * - 轮询视频状态
 * - 提供重新生成、下载等操作
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Video } from "@/db";
import { ResultPanel } from "./result-panel";

// ============================================================================
// Types
// ============================================================================

export interface ResultPanelWrapperProps {
  /**
   * 当前视频
   */
  currentVideo?: Video | null;

  /**
   * 是否正在生成
   */
  isGenerating?: boolean;

  /**
   * 生成进度
   */
  generatingProgress?: number;

  /**
   * 视频UUID（用于轮询状态）
   */
  videoUuid?: string | null;

  /**
   * 轮询间隔（毫秒）
   */
  pollInterval?: number;

  /**
   * 当视频完成时的回调
   */
  onVideoComplete?: (video: Video) => void;

  /**
   * 当生成失败时的回调
   */
  onGenerationFailed?: (error?: string) => void;

  /**
   * 重新生成的回调
   */
  onRegenerate?: () => void;

  /**
   * 额外的 CSS 类名
   */
  className?: string;
}

// ============================================================================
// ResultPanelWrapper Component
// ============================================================================

/**
 * ResultPanelWrapper - 结果面板容器
 *
 * 处理视频生成的状态轮询和结果展示
 *
 * @example
 * ```tsx
 * <ResultPanelWrapper
 *   videoUuid={generatedVideoUuid}
 *   isGenerating={isLoading}
 *   onVideoComplete={(video) => setCurrentVideo(video)}
 *   onRegenerate={handleRegenerate}
 * />
 * ```
 */
export function ResultPanelWrapper({
  currentVideo,
  isGenerating = false,
  generatingProgress = 0,
  videoUuid,
  pollInterval = 2000,
  onVideoComplete,
  onGenerationFailed,
  onRegenerate,
  className,
}: ResultPanelWrapperProps) {
  const [internalVideo, setInternalVideo] = useState<Video | null>(currentVideo ?? null);
  const [internalProgress, setInternalProgress] = useState(generatingProgress);
  const [pollingUuid, setPollingUuid] = useState<string | null>(videoUuid ?? null);

  // 更新内部状态当 props 变化时
  useEffect(() => {
    if (currentVideo) {
      setInternalVideo(currentVideo);
    }
  }, [currentVideo]);

  useEffect(() => {
    setInternalProgress(generatingProgress);
  }, [generatingProgress]);

  useEffect(() => {
    if (videoUuid !== undefined) {
      setPollingUuid(videoUuid);
    }
  }, [videoUuid]);

  // 轮询视频状态
  useEffect(() => {
    if (!pollingUuid || !isGenerating) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/v1/video/${pollingUuid}/status`);
        if (!response.ok) {
          throw new Error("Failed to fetch video status");
        }

        const result = await response.json();
        const { status, progress, data } = result.data || result;

        // 更新进度
        if (typeof progress === "number") {
          setInternalProgress(progress);
        }

        // 检查状态
        if (status === "COMPLETED") {
          setPollingUuid(null);
          if (data) {
            setInternalVideo(data);
            onVideoComplete?.(data);
          }
        } else if (status === "FAILED") {
          setPollingUuid(null);
          onGenerationFailed?.(data?.error);
        }
        // 如果状态是 PENDING 或 GENERATING，继续轮询
      } catch (error) {
        console.error("Polling error:", error);
        // 不中断轮询，网络错误可能只是暂时的
      }
    };

    // 立即执行一次
    pollStatus();

    // 设置轮询
    const intervalId = setInterval(pollStatus, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollingUuid, isGenerating, pollInterval, onVideoComplete, onGenerationFailed]);

  // 处理重新生成
  const handleRegenerate = useCallback(() => {
    setInternalVideo(null);
    setInternalProgress(0);
    onRegenerate?.();
  }, [onRegenerate]);

  // 渲染 ResultPanel
  return (
    <ResultPanel
      currentVideo={internalVideo}
      isGenerating={isGenerating || !!pollingUuid}
      generatingProgress={Math.round(internalProgress)}
      onRegenerate={onRegenerate ? handleRegenerate : undefined}
    />
  );
}

export default ResultPanelWrapper;
