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
import { useRouter } from "next/navigation";
import { use } from "react";
import { authClient } from "@/lib/auth/client";
import { useCredits } from "@/stores/credits-store";
import type { Video } from "@/db";
import type { ToolPageConfig, ToolPageRoute } from "@/config/tool-pages";
import { GeneratorPanel } from "@/components/tool/generator-panel";
import { ToolLandingPage } from "@/components/tool/tool-landing-page";
import { ResultPanelWrapper } from "@/components/tool/result-panel-wrapper";

// ============================================================================
// Types
// ============================================================================

export interface ToolPageLayoutProps {
  /**
   * 工具页面配置
   */
  config: ToolPageConfig;

  /**
   * 页面参数
   */
  params: Promise<{
    locale: string;
  }>;

  /**
   * 工具路由（用于 SEO 和导航）
   */
  toolRoute: string;
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
 *   return <ToolPageLayout config={config} params={params} toolRoute="image-to-video" />;
 * }
 * ```
 */
export function ToolPageLayout({
  config,
  params,
  toolRoute,
}: ToolPageLayoutProps) {
  const { locale } = use(params);
  const router = useRouter();
  const { balance } = useCredits();

  // 状态
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [videoUuid, setVideoUuid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generator" | "result">("generator");

  // 检查登录状态
  useEffect(() => {
    authClient.getSession().then((session) => {
      setUser(session?.data?.user ?? null);
    });
  }, []);

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

    // 开始生成
    setIsLoading(true);
    setVideoUuid(null);
    setActiveTab("result");

    try {
      const response = await fetch("/api/v1/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: data.prompt,
          model: data.model,
          mode: data.mode || config.generator.mode,
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
      setVideoUuid(result.data.videoUuid);
    } catch (error) {
      console.error("Generation error:", error);
      setIsLoading(false);
      // 可以在这里显示错误提示
    }
  }, [user, locale, router, balance, config]);

  // 处理视频完成
  const handleVideoComplete = useCallback((video: Video) => {
    setIsLoading(false);
    setCurrentVideo(video);
  }, []);

  // 处理生成失败
  const handleGenerationFailed = useCallback((error?: string) => {
    setIsLoading(false);
    console.error("Generation failed:", error);
    // 可以在这里显示错误提示
  }, []);

  // 处理重新生成
  const handleRegenerate = useCallback(() => {
    setCurrentVideo(null);
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
                  isLoading={isLoading}
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

  // Authenticated Layout: Fixed Height, Side-by-Side Application Mode
  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden p-4 lg:p-6 gap-6 bg-background">
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

      {/* Generator Panel */}
      <div
        className={`${activeTab === "generator" ? "flex" : "hidden"
          } lg:flex w-full lg:w-[380px] shrink-0 h-full`}
      >
        <GeneratorPanel
          toolType={toolRoute as "image-to-video" | "text-to-video" | "reference-to-video"}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Result Panel */}
      <div
        className={`${activeTab === "result" ? "flex" : "hidden"
          } lg:flex flex-1 h-full rounded-2xl border border-border bg-muted/20 overflow-hidden relative shadow-inner`}
      >
        <ResultPanelWrapper
          currentVideo={currentVideo}
          isGenerating={isLoading}
          videoUuid={videoUuid}
          onVideoComplete={handleVideoComplete}
          onGenerationFailed={handleGenerationFailed}
          onRegenerate={handleRegenerate}
        />
      </div>
    </div>
  );
}

export default ToolPageLayout;
