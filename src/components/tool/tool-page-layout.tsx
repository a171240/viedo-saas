/**
 * Tool Page Layout Component
 *
 * 工具页面统一布局组件
 *
 * 根据工具页面配置动态渲染：
 * - 左侧：生成器面板
 * - 右侧：落地页（未登录）或结果面板（已登录）
 *
 * SEO 友好，支持服务端渲染
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Play } from "lucide-react";
import { authClient } from "@/lib/auth/client";
import { useCredits } from "@/stores/credits-store";
import { useVideoPolling } from "@/hooks/use-video-polling";
import { videoTaskStorage } from "@/lib/video-task-storage";
import type { Video } from "@/db";
import type { ToolPageConfig } from "@/config/tool-pages";
import { GeneratorPanel } from "@/components/tool/generator-panel";
import { ToolLandingPage } from "@/components/tool/tool-landing-page";
import { ResultPanelWrapper } from "@/components/tool/result-panel-wrapper";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface ToolPageLayoutProps {
  /**
   * 工具页面配置
   */
  config: ToolPageConfig;

  /**
   * 工具路由（用于 SEO 和导航）
   */
  toolRoute: string;

  /**
   * 当前语言
   */
  locale: string;
}

// ============================================================================
// ToolPageLayout Component
// ============================================================================

/**
 * ToolPageLayout - 工具页面布局
 *
 * 处理：
 * - 用户登录状态检测
 * - 视频生成流程
 * - 积分检查
 * - 左右面板布局切换
 *
 * @example
 * ```tsx
 * import { getToolPageConfig } from "@/config/tool-pages";
 *
 * export default function ImageToVideoPage({ params }) {
 *   const config = getToolPageConfig("image-to-video");
 *   return <ToolPageLayout config={config} locale={params.locale} toolRoute="image-to-video" />;
 * }
 * ```
 */
export function ToolPageLayout({
  config,
  toolRoute,
  locale,
}: ToolPageLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance } = useCredits();
  const videoIdFromQuery = searchParams.get("id");
  const NOTIFICATION_ASKED_KEY = "videofly_notification_asked";
  const tNotify = useTranslations("Notifications");
  const tTool = useTranslations("ToolPage");

  // 状态
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVideos, setCurrentVideos] = useState<Video[]>([]);
  const [generatingIds, setGeneratingIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "result">("generator");

  const addGeneratingId = useCallback((videoId: string) => {
    setGeneratingIds((prev) => (prev.includes(videoId) ? prev : [videoId, ...prev]));
  }, []);

  const removeGeneratingId = useCallback((videoId: string) => {
    setGeneratingIds((prev) => prev.filter((id) => id !== videoId));
  }, []);

  const { startPolling, isPolling } = useVideoPolling({
    onCompleted: useCallback(
      (video) => {
        setCurrentVideos((prev) => {
          const exists = prev.find((v) => v.uuid === video.uuid);
          if (exists) {
            return prev.map((v) => (v.uuid === video.uuid ? video : v));
          }
          return [video, ...prev];
        });
        removeGeneratingId(video.uuid);
        if (user?.id) {
          videoTaskStorage.updateTask(
            video.uuid,
            { status: "completed" },
            user.id
          );
        }
      },
      [removeGeneratingId, user?.id]
    ),
    onFailed: useCallback(
      ({ videoId }) => {
        removeGeneratingId(videoId);
        if (user?.id) {
          videoTaskStorage.updateTask(
            videoId,
            { status: "failed" },
            user.id
          );
        }
      },
      [removeGeneratingId, user?.id]
    ),
  });

  // 检查登录状态
  useEffect(() => {
    authClient.getSession().then((session) => {
      setUser(session?.data?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const localTasks = videoTaskStorage.getGeneratingTasks(user.id);
    localTasks.forEach((task) => {
      addGeneratingId(task.videoId);
      if (!isPolling(task.videoId)) {
        startPolling(task.videoId);
      }
    });
  }, [user?.id, isPolling, startPolling, addGeneratingId]);

  useEffect(() => {
    if (!user?.id) return;
    if (!videoIdFromQuery) return;
    setActiveTab("result");
    addGeneratingId(videoIdFromQuery);
    if (!isPolling(videoIdFromQuery)) {
      startPolling(videoIdFromQuery);
    }
  }, [videoIdFromQuery, user?.id, isPolling, startPolling, addGeneratingId]);

  // 处理生成提交
  const handleSubmit = useCallback(async (data: any) => {
    // 检查登录
    if (!user) {
      router.push(`/${locale}/login`);
      return;
    }

    // 检查积分
    const requiredCredits = data.estimatedCredits || 0;
    const availableCredits = balance?.availableCredits ?? 0;

    if (availableCredits < requiredCredits) {
      router.push(`/${locale}/pricing`);
      return;
    }

    // 开始提交
    setIsSubmitting(true);

    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const asked = localStorage.getItem(NOTIFICATION_ASKED_KEY);
        if (!asked && Notification.permission === "default") {
          toast.info(tNotify("generationWillNotify"));
          Notification.requestPermission().finally(() => {
            localStorage.setItem(NOTIFICATION_ASKED_KEY, "1");
          });
        }
      }
    } catch (error) {
      console.warn("Notification permission request failed:", error);
    }

    try {
      const selectedMode = data.mode || config.generator.mode;
      const response = await fetch("/api/v1/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: data.prompt,
          model: data.model,
          mode: selectedMode,
          duration: data.duration,
          aspectRatio: data.aspectRatio,
          quality: data.quality,
          outputNumber: data.outputNumber,
          generateAudio: data.generateAudio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate video");
      }

      const result = await response.json();
      const videoUuid = result.data.videoUuid as string;

      setActiveTab("result");
      addGeneratingId(videoUuid);
      startPolling(videoUuid);

      if (user?.id) {
        videoTaskStorage.addTask({
          userId: user.id,
          videoId: videoUuid,
          taskId: result.data.taskId,
          prompt: data.prompt,
          model: data.model,
          mode: selectedMode,
          status: "generating",
          createdAt: Date.now(),
          notified: false,
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      // 可以在这里显示错误提示
    }
    setIsSubmitting(false);
  }, [user, locale, router, balance, config, startPolling, addGeneratingId]);

  // 处理重新生成
  const handleRegenerate = useCallback(() => {
    setActiveTab("generator");
  }, []);

  // 移动端：显示标签导航
  const showMobileTabs = true;

  // Unauthenticated Layout: Scrollable, Tool Area + Landing Page
  if (!user) {
    return (
      <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">
        {/* Mobile Tabs */}
        {showMobileTabs && (
          <div className="lg:hidden flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("generator")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "generator"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Generator
            </button>
            <button
              onClick={() => setActiveTab("result")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "result"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Result
            </button>
          </div>
        )}

        {/* Desktop Sidebar (Left) is handled by the parent layout wrapper, 
            but here we control the content area to be scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Tool Area Container */}
          <div className="container mx-auto max-w-[1600px] p-6 lg:p-8">
            <div className={`flex flex-col lg:flex-row gap-6 ${activeTab === "generator" ? "" : "lg:flex"}`}>

              {/* Generator Panel Side */}
              <div className={`${activeTab === "generator" ? "block" : "hidden"} lg:block w-full lg:w-[380px] shrink-0`}>
                <GeneratorPanel
                  toolType={toolRoute as "image-to-video" | "text-to-video" | "reference-to-video"}
                  isLoading={isSubmitting}
                  onSubmit={handleSubmit}
                />
              </div>

              {/* Result/Preview Side */}
              <div className={`${activeTab === "result" ? "block" : "hidden"} lg:block flex-1 min-h-[500px] rounded-2xl border border-border bg-muted/20 overflow-hidden relative`}>
                {/* Preview Placeholder for Unauthenticated Users */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-muted/50 mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Detailed Preview</h3>
                  <p className="text-sm max-w-xs">Login to generate and view your high-quality AI videos.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Landing Page Content */}
          <ToolLandingPage
            config={config}
            locale={locale}
          />
        </div>
      </div>
    );
  }

  // Authenticated Layout: Three-column application mode
  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden p-4 lg:p-6 gap-6 bg-background">
      {/* Mobile Tabs */}
      {showMobileTabs && (
        <div className="lg:hidden flex border-b border-border mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("generator")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "generator"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Generator
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "result"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Result
          </button>
        </div>
      )}

      <div className="grid h-full grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_320px] gap-6">
        {/* Generator Panel */}
        <div
          className={`${activeTab === "generator" ? "flex" : "hidden"
            } lg:flex flex-col h-full`}
        >
          <GeneratorPanel
            toolType={toolRoute as "image-to-video" | "text-to-video" | "reference-to-video"}
            isLoading={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Result Panel */}
        <div
          className={`${activeTab === "result" ? "flex" : "hidden"
            } lg:flex flex-1 h-full rounded-2xl border border-border bg-muted/10 overflow-hidden shadow-inner`}
        >
          <ResultPanelWrapper
            currentVideos={currentVideos}
            generatingIds={generatingIds}
            onRegenerate={handleRegenerate}
            className="h-full"
          />
        </div>

        {/* Side Panel */}
        <aside className="hidden xl:flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tTool("queueTitle")}
              </span>
              <span className="text-xs text-muted-foreground">{generatingIds.length}</span>
            </div>
            <div className="p-4 space-y-2">
              {generatingIds.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  {tTool("queueEmpty")}
                </div>
              ) : (
                generatingIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span className="truncate max-w-[160px]">{id}</span>
                    <span className="text-[10px] uppercase">Generating</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {tTool("recentTitle")}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {currentVideos.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  {tTool("recentEmpty")}
                </div>
              ) : (
                currentVideos.slice(0, 3).map((video) => (
                  <div key={video.uuid} className="flex gap-3 items-start">
                    <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.prompt}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Play className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase text-muted-foreground">
                        {video.model || "Model"}
                      </div>
                      <div className="text-sm text-foreground line-clamp-2">
                        {video.prompt || ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ToolPageLayout;
