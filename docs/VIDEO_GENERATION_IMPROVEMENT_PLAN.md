# VideoFly 首页视频生成组件改进规划方案

> **创建日期**: 2026-01-23
> **状态**: 规划中
> **参考项目**: soar2app-video

---

## 一、当前问题分析

### 1.1 核心问题

| 问题 | 位置 | 原因 |
|------|------|------|
| **提交按钮无响应** | `hero-section.tsx:96-103` | `onSubmit` 只是 `console.log`，无实际逻辑 |
| **无页面跳转** | `hero-section.tsx` | 缺少提交后跳转到工具页面的逻辑 |
| **生成中表单被禁用** | `tool-page-layout.tsx:208-210` | `isLoading` 直接传给 `GeneratorPanel`，禁用了整个表单 |
| **无多任务并行支持** | 全局架构 | 缺少任务队列和独立轮询机制 |
| **My Creations 实时性差** | `my-creations-page.tsx` | 依赖刷新获取状态，无全局任务同步 |

### 1.2 对比参考项目的差异

| 功能 | VideoFly 当前状态 | soar2app-video 参考实现 |
|------|------------------|------------------------|
| 提交流程 | 首页 → (无动作) | 首页 → 调用 API → 跳转工具页 |
| 生成中状态 | 表单禁用，不能继续生成 | 提交后立即解锁，可继续生成 |
| 任务管理 | 单任务模式 | localStorage + 数据库双存储 |
| 状态轮询 | 单页面内轮询 | 全局后台检测（每 30 秒） |
| 通知机制 | 无 | 浏览器通知 + Toast |

---

## 二、改进方案设计

### 2.1 整体交互流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          用户输入 → 视频生成流程                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐│
│  │ 首页输入 │───▶│ 登录检查 │───▶│ API调用 │───▶│ 页面跳转 │───▶│ 后台轮询 ││
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘│
│       │              │              │              │              │       │
│       ▼              ▼              ▼              ▼              ▼       │
│  输入内容/     未登录→保存      预扣积分        立即返回       每3秒查询   │
│  上传图片       到localStorage    创建任务        任务ID         更新状态   │
│                               返回uuid                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     提交后立即解锁表单                            │   │
│  │  用户可以继续输入新的内容，生成第二个/第三个视频...                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                   全局后台任务检测（App Layout层）                │   │
│  │  • 每30秒检测所有生成中的任务                                      │   │
│  │  • 完成时发送浏览器通知 + Toast                                    │   │
│  │  • 同步更新 My Creations 页面                                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术架构设计

#### 核心模块

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           新增/修改模块                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  【新增】 VideoTaskStorage                ┌─────────────────────────┐   │
│  ├── addTask(task)                       │ • localStorage 存储任务  │   │
│  ├── updateTask(uuid, updates, userId?)  │ • 24小时过期自动清理     │   │
│  ├── removeTask(uuid)                    │ • 支持多任务并行         │   │
│  ├── getGeneratingTasks(userId?)         └─────────────────────────┘   │
│  └── clearExpiredTasks()                                               │
│                                                                         │
│  【新增】 useBackgroundTasks() Hook        ┌─────────────────────────┐   │
│  ├── 从 localStorage + DB 获取任务列表    │ • App Layout 层调用     │   │
│  ├── 并发检查所有任务状态                 │ • 每30秒执行一次        │   │
│  ├── 完成时发送通知                        │ • 通知防重复机制        │   │
│  └── 自动清理过期任务                      └─────────────────────────┘   │
│                                                                         │
│  【新增】 useVideoPolling() Hook          ┌─────────────────────────┐   │
│  ├── startPolling(videoId)               │ • 单视频独立轮询         │   │
│  ├── stopPolling(videoId)                │ • 3秒轮询间隔            │   │
│  ├── onCompleted callback                 │ • 支持多视频并行轮询     │   │
│  └── onFailed callback                    └─────────────────────────┘   │
│                                                                         │
│  【修改】 hero-section.tsx                ┌─────────────────────────┐   │
│  ├── 处理未登录状态                         │ • 保存到 localStorage    │   │
│  ├── 调用生成 API                           │ • 跳转到对应工具页面      │   │
│  └── 跳转到工具页面                          └─────────────────────────┘   │
│                                                                         │
│  【修改】 tool-page-layout.tsx            ┌─────────────────────────┐   │
│  ├── isTaskSubmitted 状态                 │ • 区分"提交中"和"已提交"  │   │
│  ├── 提交后立即解锁表单                     │ • 允许继续生成          │   │
│  └── 集成 useVideoPolling                  └─────────────────────────┘   │
│                                                                         │
│  【修改】 generator-panel.tsx             ┌─────────────────────────┐   │
│  ├── 移除 isLoading 禁用逻辑               │ • 仅在 API 调用时禁用    │   │
│  └── 添加生成队列提示（可选）                └─────────────────────────┘   │
│                                                                         │
│  【新增】 通知组件                         ┌─────────────────────────┐   │
│  ├── 浏览器通知                         │ • 请求通知权限          │   │
│  ├── Toast 通知                          │ • 任务完成提示          │   │
│  └── 通知设置面板                          └─────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 三、详细实施步骤

### 第一阶段：核心任务管理（优先级：P0）

#### Step 1.1 创建 VideoTaskStorage

**文件**: `src/lib/video-task-storage.ts`

```typescript
/**
 * VideoTaskStorage - 视频任务本地存储管理
 *
 * 功能：
 * - localStorage 存储任务列表
 * - 24小时过期自动清理
 * - 支持多任务并行
 */

export interface VideoTask {
  userId?: string;
  videoId: string;
  taskId: string;
  prompt: string;
  model: string;
  mode: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  createdAt: number;
  notified: boolean;
}

class VideoTaskStorage {
  private readonly STORAGE_KEY = 'videofly_video_tasks';
  private readonly EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  private getStorageKey(userId?: string) {
    return `${this.STORAGE_KEY}:${userId ?? 'anon'}`;
  }

  /**
   * 添加新任务
   */
  addTask(task: VideoTask): void {
    const tasks = this.getAllTasks(task.userId);
    const exists = tasks.find(t => t.videoId === task.videoId);
    if (!exists) tasks.push(task);
    this.saveTasks(tasks, task.userId);
  }

  /**
   * 更新任务状态
   */
  updateTask(videoId: string, updates: Partial<VideoTask>, userId?: string): void {
    const tasks = this.getAllTasks(userId);
    const index = tasks.findIndex(t => t.videoId === videoId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      this.saveTasks(tasks, userId);
    }
  }

  /**
   * 移除任务
   */
  removeTask(videoId: string, userId?: string): void {
    const tasks = this.getAllTasks(userId).filter(t => t.videoId !== videoId);
    this.saveTasks(tasks, userId);
  }

  /**
   * 获取所有生成中的任务
   */
  getGeneratingTasks(userId?: string): VideoTask[] {
    return this.getAllTasks(userId).filter(t =>
      t.status === 'generating' || t.status === 'pending'
    );
  }

  /**
   * 清理过期任务
   */
  clearExpiredTasks(userId?: string): void {
    const now = Date.now();
    const tasks = this.getAllTasks(userId).filter(t =>
      now - t.createdAt < this.EXPIRY_MS
    );
    this.saveTasks(tasks, userId);
  }

  /**
   * 获取所有任务
   */
  private getAllTasks(userId?: string): VideoTask[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.getStorageKey(userId));
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存任务列表
   */
  private saveTasks(tasks: VideoTask[], userId?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getStorageKey(userId), JSON.stringify(tasks));
  }
}

export const videoTaskStorage = new VideoTaskStorage();
```

#### Step 1.2 创建 useVideoPolling Hook

**文件**: `src/hooks/use-video-polling.ts`

```typescript
/**
 * useVideoPolling - 视频状态轮询 Hook
 *
 * 功能：
 * - 单视频独立轮询
 * - 3秒轮询间隔
 * - 支持多视频并行轮询
 */

import { useRef, useCallback, useEffect } from 'react';
import type { Video } from '@/db';

interface UseVideoPollingOptions {
  pollInterval?: number;
  onCompleted?: (video: Video) => void;
  onFailed?: (args: { videoId: string; error?: string }) => void;
}

export function useVideoPolling(options: UseVideoPollingOptions = {}) {
  const {
    pollInterval = 3000,
    onCompleted,
    onFailed,
  } = options;

  const pollingIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  /**
   * 开始轮询单个视频
   */
  const startPolling = useCallback((videoId: string) => {
    // 如果已经在轮询，先停止
    if (pollingIntervals.current.has(videoId)) {
      stopPolling(videoId);
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/v1/video/${videoId}/status`);
        if (!response.ok) {
          throw new Error('Failed to fetch video status');
        }

        const result = await response.json();
        const { status, data } = result.data || result;

        if (status === 'COMPLETED') {
          stopPolling(videoId);
          if (data) {
            onCompleted?.(data);
          }
        } else if (status === 'FAILED') {
          stopPolling(videoId);
          onFailed?.({ videoId, error: data?.error });
        }
        // PENDING 或 GENERATING 继续轮询
      } catch (error) {
        console.error('Polling error:', error);
        // 网络错误不中断轮询
      }
    };

    // 立即执行一次
    pollStatus();

    // 设置定时轮询
    const intervalId = setInterval(pollStatus, pollInterval);
    pollingIntervals.current.set(videoId, intervalId);
  }, [pollInterval, onCompleted, onFailed]);

  /**
   * 停止轮询单个视频
   */
  const stopPolling = useCallback((videoId: string) => {
    const intervalId = pollingIntervals.current.get(videoId);
    if (intervalId) {
      clearInterval(intervalId);
      pollingIntervals.current.delete(videoId);
    }
  }, [notifyComplete, notifyFailed]);

  /**
   * 停止所有轮询
   */
  const stopAllPolling = useCallback(() => {
    pollingIntervals.current.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    pollingIntervals.current.clear();
  }, []);

  /**
   * 检查是否正在轮询
   */
  const isPolling = useCallback((videoId: string) => {
    return pollingIntervals.current.has(videoId);
  }, []);

  // 组件卸载时清理所有轮询
  useEffect(() => {
    return () => stopAllPolling();
  }, [stopAllPolling]);

  return {
    startPolling,
    stopPolling,
    stopAllPolling,
    isPolling,
  };
}
```

#### Step 1.3 创建 useBackgroundTasks Hook

**文件**: `src/hooks/use-background-tasks.ts`

```typescript
/**
 * useBackgroundTasks - 全局后台任务检测 Hook
 *
 * 功能：
 * - 从 localStorage + DB 获取任务列表
 * - 每30秒执行一次
 * - 通知防重复机制
 * - 自动清理过期任务
 */

import { useEffect, useRef } from 'react';
import { authClient } from '@/lib/auth/client';
import { videoTaskStorage } from '@/lib/video-task-storage';
import type { VideoTask } from '@/lib/video-task-storage';
import { useVideoNotification } from "@/components/video/video-task-notification";

export function useBackgroundTasks() {
  const isCheckingRef = useRef(false);
  const lastCheckTime = useRef<number>(0);
  const CHECK_INTERVAL = 30000; // 30 seconds
  const { notifyComplete, notifyFailed } = useVideoNotification();

  useEffect(() => {
    let mounted = true;

    const checkTasks = async () => {
      // 防抖：如果正在检查，跳过
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        // 1. 获取数据库任务 + userId
        const session = await authClient.getSession();
        if (!session?.data?.user) {
          return;
        }
        const userId = session.data.user.id;

        // 2. 获取本地任务
        const localTasks = videoTaskStorage.getGeneratingTasks(userId);

        const dbResponse = await fetch('/api/v1/video/generating');
        if (!dbResponse.ok) {
          throw new Error('Failed to fetch generating tasks');
        }
        const dbResult = await dbResponse.json();
        const dbTasks = dbResult.data || [];

        // 3. 合并任务列表（去重）
        const taskMap = new Map<string, VideoTask>();

        localTasks.forEach(task => taskMap.set(task.videoId, task));
        dbTasks.forEach((task: VideoTask) => {
          // 数据库任务优先级更高
          taskMap.set(task.videoId, {
            ...task,
            userId,
            notified: taskMap.get(task.videoId)?.notified || task.notified,
          });
        });

        const allTasks = Array.from(taskMap.values());

        // 4. 并发检查所有任务状态
        await Promise.allSettled(
          allTasks.map(task => checkTaskStatus(task, userId))
        );

        // 5. 清理过期任务
        videoTaskStorage.clearExpiredTasks(userId);

        lastCheckTime.current = Date.now();
      } catch (error) {
        console.error('Background task check error:', error);
      } finally {
        if (mounted) isCheckingRef.current = false;
      }
    };

    const checkTaskStatus = async (task: VideoTask, userId: string) => {
      try {
        const response = await fetch(`/api/v1/video/${task.videoId}/status`);
        if (!response.ok) return;

        const result = await response.json();
        const { status, data } = result.data || result;

        if (status === 'COMPLETED') {
          // 更新本地存储
          videoTaskStorage.updateTask(task.videoId, {
            status: 'completed',
            notified: true,
          }, userId);

          // 发送通知
          if (!task.notified) {
            notifyComplete(task, data);
          }
        } else if (status === 'FAILED') {
          videoTaskStorage.updateTask(task.videoId, {
            status: 'failed',
            notified: true,
          }, userId);

          if (!task.notified) {
            notifyFailed(task, data?.error);
          }
        } else {
          // 更新本地状态
          videoTaskStorage.updateTask(task.videoId, { status: status.toLowerCase() }, userId);
        }
      } catch (error) {
        console.error(`Failed to check task ${task.videoId}:`, error);
      }
    };

    // 立即执行一次
    checkTasks();

    // 定时检查
    const interval = setInterval(checkTasks, CHECK_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    isChecking: isCheckingRef.current,
    lastCheckTime: lastCheckTime.current,
  };
}
```

---

### 第二阶段：首页提交流程（优先级：P0）

#### Step 2.1 修改 hero-section.tsx

**文件**: `src/components/landing/hero-section.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/lib/auth/client";

import { VideoGeneratorInput } from "@/components/video-generator";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Meteors } from "@/components/magicui/meteors";
import { cn } from "@/components/ui";

// storage keys
const PENDING_PROMPT_KEY = 'hero_input_pending_prompt';
const PENDING_IMAGE_KEY = 'hero_input_pending_image';

/**
 * Hero Section - 视频生成器优先设计
 *
 * 设计模式: Video-First Hero with Glassmorphism
 * - Hero 区域直接集成视频生成组件
 * - Glassmorphism 风格: 背景模糊、透明层、微妙边框
 * - Magic UI 动画组件增强交互体验
 */
export function HeroSection() {
  const t = useTranslations("Hero");
  const locale = useLocale();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);

  // 获取会话信息
  const { data: session } = authClient.useSession();

  /**
   * 处理视频生成提交
   */
  const handleSubmit = async (data: any) => {
    // 1. 未登录处理：保存到 localStorage，弹出登录框
    if (!session?.user) {
      localStorage.setItem(PENDING_PROMPT_KEY, data.prompt);

      // 如果有图片，保存到 localStorage
      if (data.images && data.images.length > 0) {
        const reader = new FileReader();
        reader.onloadend = () => {
          // 避免 localStorage 超配额：建议改成 sessionStorage 或 IndexedDB
          sessionStorage.setItem(PENDING_IMAGE_KEY, reader.result as string);
        };
        reader.readAsDataURL(data.images[0]);
      }

      setShowSignModal(true);
      return;
    }

    // 2. 已登录：调用生成 API
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: data.prompt,
          model: data.model,
          mode: data.mode,
          duration: data.duration,
          aspectRatio: data.aspectRatio,
          quality: data.resolution,
          outputNumber: data.outputNumber,
          generateAudio: data.generateAudio,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate video");
      }

      const result = await response.json();

      // 3. 跳转到对应工具页面
      const toolRoute = getToolRouteByMode(data.mode);
      router.push(`/${locale}/${toolRoute}?id=${result.data.videoUuid}`);
    } catch (error) {
      console.error("Generation error:", error);
      // TODO: 显示错误提示
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 根据模式获取对应的工具路由
   */
  const getToolRouteByMode = (mode: string): string => {
    switch (mode) {
      case 'text-to-video':
      case 't2v':
        return 'text-to-video';
      case 'image-to-video':
      case 'i2v':
        return 'image-to-video';
      case 'reference-to-video':
      case 'r2v':
        return 'reference-to-video';
      default:
        return 'text-to-video';
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden pb-20">
      {/* 背景渐变效果 */}
      <div className="absolute inset-0 -z-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/15 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-500/10 via-background to-background" />
      </div>

      {/* 动画流星效果 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Meteors number={15} minDelay={0.5} maxDelay={2} minDuration={3} maxDuration={8} />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col items-center gap-10">
          {/* 标题与说明区域 */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center space-y-6 max-w-3xl mx-auto"
          >
            <BlurFade delay={0.1} inView>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                {t("title")}
              </h1>
            </BlurFade>

            <BlurFade delay={0.2} inView>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("description")}
              </p>
            </BlurFade>

            <BlurFade delay={0.3} inView className="flex flex-wrap justify-center gap-3">
              {[
                { icon: Zap, label: t("features.fast"), color: "text-yellow-500" },
                { icon: Play, label: t("features.easy"), color: "text-blue-500" },
                { icon: Sparkles, label: t("features.ai"), color: "text-purple-500" },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-sm"
                  >
                    <Icon className={cn("h-4 w-4", feature.color)} />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </motion.div>
                );
              })}
            </BlurFade>
          </motion.div>

          {/* 视频生成器 - 核心组件 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="w-full max-w-4xl mx-auto relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-3xl -z-10" />

            <VideoGeneratorInput
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onSubmit={handleSubmit}
            />

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-xs text-muted-foreground mt-4"
            >
              {t("creditsHint")}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* 登录弹窗 */}
      {showSignModal && (
        <SignInModal
          open={showSignModal}
          onOpenChange={setShowSignModal}
        />
      )}
    </section>
  );
}
```

#### Step 2.2 处理登录后恢复

**文件**: `src/components/landing/hero-section.tsx` (添加 effect)

```typescript
useEffect(() => {
  // 登录后恢复之前的输入
  if (session?.user) {
    const pendingPrompt = localStorage.getItem(PENDING_PROMPT_KEY);
    const pendingImage = sessionStorage.getItem(PENDING_IMAGE_KEY);

    if (pendingPrompt) {
      localStorage.removeItem(PENDING_PROMPT_KEY);

      // 自动提交或填充到输入框
      // 这里选择填充到输入框，让用户确认后再提交
      setPrompt(pendingPrompt);

      if (pendingImage) {
        sessionStorage.removeItem(PENDING_IMAGE_KEY);
        // 恢复图片
        // TODO: VideoGeneratorInput 需暴露 setFormData / initialValues 能力
      }

      // 可选：显示提示
      toast.info('Your previous input has been restored');
    }
  }
}, [session?.user]);
```

---

### 第三阶段：工具页面改进（优先级：P0）

#### Step 3.1 修改 tool-page-layout.tsx

**文件**: `src/components/tool/tool-page-layout.tsx`

```typescript
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
import { authClient } from "@/lib/auth/client";
import { useCredits } from "@/stores/credits-store";
import { useVideoPolling } from "@/hooks/use-video-polling";
import { videoTaskStorage } from "@/lib/video-task-storage";
import { authClient } from "@/lib/auth/client";
import type { Video } from "@/db";
import type { ToolPageConfig } from "@/config/tool-pages";
import { GeneratorPanel } from "@/components/tool/generator-panel";
import { ToolLandingPage } from "@/components/tool/tool-landing-page";
import { ResultPanelWrapper } from "@/components/tool/result-panel-wrapper";

// ============================================================================
// Types
// ============================================================================

export interface ToolPageLayoutProps {
  config: ToolPageConfig;
  locale: string;
  toolRoute: string;
}

// ============================================================================
// ToolPageLayout Component
// ============================================================================

export function ToolPageLayout({
  config,
  locale,
  toolRoute,
}: ToolPageLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { balance } = useCredits();

  // 状态管理
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // 仅在 API 调用期间为 true
  const [currentVideos, setCurrentVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "result">("generator");

  // 视频轮询 Hook
  const polling = useVideoPolling({
    onCompleted: (video) => {
      setCurrentVideos(prev => {
        const exists = prev.find(v => v.uuid === video.uuid);
        if (exists) return prev;
        return [video, ...prev];
      });
      setIsSubmitting(false);
    },
    onFailed: ({ error }) => {
      console.error("Generation failed:", error);
      setIsSubmitting(false);
    },
  });

  // 检查登录状态
  useEffect(() => {
    authClient.getSession().then((session) => {
      setUser(session?.data?.user ?? null);
    });
  }, []);

  // 检查 URL 是否有视频 ID 参数，如果有则开始轮询
  useEffect(() => {
    const videoId = searchParams.get('id');
    if (videoId && user && !polling.isPolling(videoId)) {
      setActiveTab("result");
      polling.startPolling(videoId);
    }
  }, [searchParams, user, polling]);

  /**
   * 处理生成提交
   */
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
      const { videoUuid, taskId } = result.data;

      // 提交成功后立即解锁表单
      setIsSubmitting(false);

      // 切换到结果面板
      setActiveTab("result");

      // 开始后台轮询
      polling.startPolling(videoUuid);

      // 保存到 localStorage
      videoTaskStorage.addTask({
        userId: user.id,
        videoId: videoUuid,
        taskId: taskId,
        prompt: data.prompt,
        model: data.model,
        mode: data.mode,
        status: 'generating',
        createdAt: Date.now(),
        notified: false,
      });

    } catch (error) {
      console.error("Generation error:", error);
      setIsSubmitting(false);
      // TODO: 显示错误提示
    }
  }, [user, locale, router, balance, config, polling]);

  /**
   * 处理视频完成
   */
  const handleVideoComplete = useCallback((video: Video) => {
    setCurrentVideos(prev => {
      const exists = prev.find(v => v.uuid === video.uuid);
      if (exists) return prev;
      return [video, ...prev];
    });
  }, []);

  /**
   * 处理生成失败
   */
  const handleGenerationFailed = useCallback((error?: string) => {
    console.error("Generation failed:", error);
    // TODO: 显示错误提示
  }, []);

  /**
   * 处理重新生成
   */
  const handleRegenerate = useCallback(() => {
    setActiveTab("generator");
  }, []);

  // 移动端：显示标签导航
  const showMobileTabs = true;

  // Unauthenticated Layout
  if (!user) {
    return (
      <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">
        {/* Mobile Tabs */}
        {showMobileTabs && (
          <div className="lg:hidden flex border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("generator")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "generator"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Generator
            </button>
            <button
              onClick={() => setActiveTab("result")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "result"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Result
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="container mx-auto max-w-[1600px] p-6 lg:p-8">
            <div className={`flex flex-col lg:flex-row gap-6 ${activeTab === "generator" ? "" : "lg:flex"}`}>
              <div className={`${activeTab === "generator" ? "block" : "hidden"} lg:block w-full lg:w-[380px] shrink-0`}>
                <GeneratorPanel
                  toolType={toolRoute as "image-to-video" | "text-to-video" | "reference-to-video"}
                  isLoading={isSubmitting}
                  onSubmit={handleSubmit}
                />
              </div>

              <div className={`${activeTab === "result" ? "block" : "hidden"} lg:block flex-1 min-h-[500px] rounded-2xl border border-border bg-muted/20 overflow-hidden relative`}>
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

          <ToolLandingPage config={config} locale={locale} />
        </div>
      </div>
    );
  }

  // Authenticated Layout
  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden p-4 lg:p-6 gap-6 bg-background">
      {/* Mobile Tabs */}
      {showMobileTabs && (
        <div className="lg:hidden flex border-b border-border mb-4 shrink-0">
          <button
            onClick={() => setActiveTab("generator")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "generator"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Generator
          </button>
          <button
            onClick={() => setActiveTab("result")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "result"
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
        className={`${activeTab === "generator" ? "flex" : "hidden"} lg:flex w-full lg:w-[380px] shrink-0 h-full`}
      >
        <GeneratorPanel
          toolType={toolRoute as "image-to-video" | "text-to-video" | "reference-to-video"}
          isLoading={isSubmitting}
          onSubmit={handleSubmit}
        />
      </div>

      {/* Result Panel */}
      <div
        className={`${activeTab === "result" ? "flex" : "hidden"} lg:flex flex-1 h-full rounded-2xl border border-border bg-muted/20 overflow-hidden relative shadow-inner`}
      >
        <ResultPanelWrapper
          currentVideos={currentVideos}
          isGenerating={isSubmitting}
          onVideoComplete={handleVideoComplete}
          onGenerationFailed={handleGenerationFailed}
          onRegenerate={handleRegenerate}
        />
      </div>
    </div>
  );
}

export default ToolPageLayout;
```

#### Step 3.2 修改 result-panel-wrapper.tsx 支持多视频

**文件**: `src/components/tool/result-panel-wrapper.tsx`

```typescript
/**
 * ResultPanelWrapper Component
 *
 * 结果面板容器组件，用于已登录用户
 *
 * 功能：
 * - 显示视频生成进度
 * - 显示生成的视频结果（支持多个）
 * - 轮询视频状态
 * - 提供重新生成、下载等操作
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { Video } from "@/db";
import { ResultPanel } from "./result-panel";

export interface ResultPanelWrapperProps {
  currentVideos?: Video[];
  isGenerating?: boolean;
  onVideoComplete?: (video: Video) => void;
  onGenerationFailed?: (error?: string) => void;
  onRegenerate?: () => void;
  className?: string;
}

export function ResultPanelWrapper({
  currentVideos = [],
  isGenerating = false,
  onVideoComplete,
  onGenerationFailed,
  onRegenerate,
  className,
}: ResultPanelWrapperProps) {
  const [videos, setVideos] = useState<Video[]>(currentVideos);

  // 同步外部 videos
  useEffect(() => {
    setVideos(currentVideos);
  }, [currentVideos]);

  const handleRegenerate = useCallback(() => {
    onRegenerate?.();
  }, [onRegenerate]);

  return (
    <ResultPanel
      currentVideos={videos}
      isGenerating={isGenerating}
      onRegenerate={onRegenerate ? handleRegenerate : undefined}
      className={className}
    />
  );
}

export default ResultPanelWrapper;
```

---

### 第四阶段：全局任务检测（优先级：P1）

#### Step 4.1 在 App Layout 中集成

**文件**: `src/app/[locale]/layout.tsx`

```typescript
import LayoutClient from "@/components/layout/layout-client";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <html lang={locale}>
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}

// 新增客户端包装组件（src/components/layout/layout-client.tsx）
// "use client";
// import { useBackgroundTasks } from "@/hooks/use-background-tasks";
//
// export default function LayoutClient({ children }: { children: React.ReactNode }) {
//   useBackgroundTasks();
//   return <>{children}</>;
// }
```

#### Step 4.2 创建通知组件

**文件**: `src/components/video/video-task-notification.tsx`

```typescript
/**
 * Video Task Notification Component
 *
 * 功能：
 * - 浏览器通知
 * - Toast 通知
 * - 通知设置面板
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { videoTaskStorage } from "@/lib/video-task-storage";
import type { VideoTask } from "@/lib/video-task-storage";

export function useVideoNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  /**
   * 请求通知权限
   */
  const requestPermission = useCallback(async () => {
    // 建议在用户主动操作时调用（例如“开启通知”按钮）
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  }, []);

  /**
   * 发送视频完成通知
   */
  const notifyComplete = useCallback((task: VideoTask, video?: any) => {
    // 浏览器通知
    if (permission === 'granted') {
      new Notification('Video Ready!', {
        body: `"${task.prompt.substring(0, 50)}${task.prompt.length > 50 ? '...' : ''}" is ready to view.`,
        icon: video?.thumbnailUrl || '/icons/video-ready.png',
        tag: task.videoId,
        requireInteraction: false,
      });
    }

    // Toast 通知
    toast.success('Your video is ready!', {
      description: task.prompt.substring(0, 100),
      action: {
        label: 'View',
        onClick: () => {
          // 跳转到视频详情页
          window.location.href = `/my-creations?video=${task.videoId}`;
        },
      },
    });

    // 标记已通知
    videoTaskStorage.updateTask(task.videoId, { notified: true }, task.userId);
  }, [permission]);

  /**
   * 发送视频失败通知
   */
  const notifyFailed = useCallback((task: VideoTask, error?: string) => {
    if (permission === 'granted') {
      new Notification('Video Generation Failed', {
        body: error || 'Please try again or contact support.',
        icon: '/icons/video-error.png',
        tag: task.videoId,
      });
    }

    toast.error('Video generation failed', {
      description: error || 'Please try again.',
    });

    videoTaskStorage.updateTask(task.videoId, { notified: true }, task.userId);
  }, [permission]);

  return {
    permission,
    requestPermission,
    notifyComplete,
    notifyFailed,
  };
}
```

---

### 第五阶段：My Creations 实时更新（优先级：P1）

#### Step 5.1 修改 my-creations-page.tsx

**文件**: `src/components/creation/my-creations-page.tsx`

```typescript
/**
 * MyCreationsPage Component
 *
 * 我的创作页面 - 实时更新版本
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useVideoPolling } from "@/hooks/use-video-polling";
import { videoTaskStorage } from "@/lib/video-task-storage";
import type { Video } from "@/db";
import { CreationGrid } from "./creation-grid";
import { CreationFilter } from "./creation-filter";

export function MyCreationsPage({ locale }: { locale: string }) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filter, setFilter] = useState<any>({
    status: 'all',
    model: 'all',
    sortBy: 'createdAt',
  });
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // 视频轮询 Hook
  const polling = useVideoPolling({
    onCompleted: (video) => {
      setVideos(prev => {
        const exists = prev.find(v => v.uuid === video.uuid);
        if (exists) {
          // 更新已存在的视频
          return prev.map(v => v.uuid === video.uuid ? video : v);
        }
        // 添加新视频到开头
        return [video, ...prev];
      });
    },
    onFailed: ({ videoId }) => {
      setVideos(prev => prev.map(v =>
        v.uuid === videoId ? { ...v, status: 'FAILED' } : v
      ));
    },
  });

  // 初始加载视频列表
  useEffect(() => {
    fetchVideos();
  }, [filter]);

  // 监听 localStorage 变化（跨标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const key = e.key || "";
      const matchKey = `videofly_video_tasks:${userId ?? 'anon'}`;
      if (key === matchKey) {
        // 重新获取视频列表
        fetchVideos();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [filter, userId]);

  // 检查本地任务并开始轮询
  useEffect(() => {
    const localTasks = videoTaskStorage.getGeneratingTasks(userId);
    localTasks.forEach(task => {
      if (!polling.isPolling(task.videoId)) {
        polling.startPolling(task.videoId);
      }
    });

    return () => {
      localTasks.forEach(task => {
        polling.stopPolling(task.videoId);
      });
    };
  }, [polling, userId]);

  const fetchVideos = async () => {
    const response = await fetch('/api/v1/video/list');
    const result = await response.json();
    setVideos(result.data || []);
  };

  const handleFilterChange = (newFilter: any) => {
    setFilter(newFilter);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Creations</h1>
        <CreationFilter filter={filter} onChange={handleFilterChange} />
      </div>

      <CreationGrid
        videos={videos}
        onVideoDelete={(uuid) => {
          setVideos(prev => prev.filter(v => v.uuid !== uuid));
          polling.stopPolling(uuid);
        }}
      />
    </div>
  );
}
```

---

## 四、文件清单

### 新增文件

| 文件路径 | 功能描述 | 优先级 |
|---------|----------|--------|
| `src/lib/video-task-storage.ts` | 任务本地存储管理 | P0 |
| `src/hooks/use-video-polling.ts` | 视频状态轮询 Hook | P0 |
| `src/hooks/use-background-tasks.ts` | 全局后台任务检测 Hook | P1 |
| `src/components/video/video-task-notification.tsx` | 通知组件 | P1 |
| `src/components/video/generating-queue-badge.tsx` | 生成队列徽章（可选） | P2 |
| `src/components/layout/layout-client.tsx` | Layout 客户端包装（全局任务检测） | P1 |

### 修改文件

| 文件路径 | 修改内容 | 优先级 |
|---------|----------|--------|
| `src/components/landing/hero-section.tsx` | 添加提交流程和跳转逻辑 | P0 |
| `src/components/tool/tool-page-layout.tsx` | 添加 isSubmitting 状态，修改禁用逻辑 | P0 |
| `src/components/tool/generator-panel.tsx` | 移除生成中的表单禁用 | P0 |
| `src/components/tool/result-panel-wrapper.tsx` | 支持多视频展示 | P0 |
| `src/components/tool/result-panel.tsx` | 支持多视频网格布局 | P0 |
| `src/components/creation/my-creations-page.tsx` | 添加实时更新机制 | P1 |
| `src/app/[locale]/layout.tsx` | 集成 useBackgroundTasks | P1 |

### API 调整

| 端点 | 调整内容 | 优先级 |
|------|----------|--------|
| `/api/v1/video/generate` | 确保返回 `videoUuid` 和 `taskId` | P0 |
| `/api/v1/video/generating` | 新增：获取所有生成中的任务 | P1 |
| `/api/v1/video/:uuid/status` | 确保返回完整视频数据 | P0 |

---

## 五、实现优先级

| 阶段 | 优先级 | 预计工作量 | 核心功能 | 依赖 |
|------|--------|-----------|----------|------|
| 第一阶段 | **P0** | 2-3h | 任务存储 + 轮询机制 | 无 |
| 第二阶段 | **P0** | 1-2h | 首页提交 + 跳转 | 第一阶段 |
| 第三阶段 | **P0** | 2-3h | 工具页面多任务支持 | 第一、二阶段 |
| 第四阶段 | **P1** | 2-3h | 全局检测 + 通知 | 第一阶段 |
| 第五阶段 | **P1** | 1-2h | My Creations 实时更新 | 第一、四阶段 |

**总计**: 约 8-13 小时

---

## 六、测试要点

### 6.1 首页提交流程

- [ ] 未登录时保存输入 → 登录后恢复
- [ ] 提交后跳转到正确工具页面
- [ ] URL 带上 `?id=xxx` 参数
- [ ] 积分不足时跳转到 pricing 页面

### 6.2 多任务并行

- [ ] 连续生成 3 个视频
- [ ] 左侧表单始终可用
- [ ] 右侧显示所有生成中的视频
- [ ] 每个视频独立轮询状态

### 6.3 状态同步

- [ ] 切换页面后任务继续轮询
- [ ] My Creations 实时显示最新状态
- [ ] 完成后收到通知
- [ ] 跨标签页状态同步

### 6.4 边界情况

- [ ] 网络断开时的重试逻辑
- [ ] localStorage 过期清理
- [ ] 页面关闭时清理轮询
- [ ] 重复提交的处理
- [ ] 浏览器通知权限处理

---

## 七、参考资料

### 7.1 参考项目实现

- **soar2app-video**: `/Users/ameng/workspace/soar2app-video`
  - `src/components/blocks/hero/hero-input/index.tsx` - 首页输入组件
  - `src/lib/video-task-storage.ts` - 任务存储实现
  - `src/hooks/useVideoPolling.ts` - 轮询 Hook
  - `src/hooks/useBackgroundTasks.ts` - 全局任务检测

### 7.2 相关文档

- [VideoFly 技术架构文档](./TECHNICAL_ARCHITECTURE.md)
- [VideoFly 组件规范](./spec/COMPONENT_SPECIFICATION.md)
- [API 集成指南](./API-INTEGRATION-GUIDE.md)

---

## 八、变更日志

| 日期 | 版本 | 变更内容 |
|------|------|----------|
| 2026-01-23 | 1.0 | 初始版本 |
