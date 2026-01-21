"use client";

import { Sparkles, Zap, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { VideoGeneratorInput } from "@/components/video-generator";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Meteors } from "@/components/magicui/meteors";
import { cn } from "@/components/ui";

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

  return (
    <section className="relative min-h-screen overflow-hidden pb-20">
      {/* 背景渐变效果 */}
      <div className="absolute inset-0 -z-20">
        {/* 顶部径向渐变 - 天蓝色 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/15 via-background to-background" />
        {/* 底部径向渐变 - 紫色 */}
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
            {/* 主标题 */}
            <BlurFade delay={0.1} inView>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                {t("title")}
              </h1>
            </BlurFade>

            {/* 描述 */}
            <BlurFade delay={0.2} inView>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {t("description")}
              </p>
            </BlurFade>

            {/* 特性标签 */}
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
            {/* 装饰性光晕效果 */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-3xl blur-3xl -z-10" />

            {/* 视频生成器 - 不需要外层容器，直接使用组件 */}
            <VideoGeneratorInput
              isLoading={false}
              disabled={false}
              onSubmit={(data) => {
                console.log("生成视频:", data);
                // TODO: 实现视频生成逻辑
              }}
            />

            {/* 底部提示 */}
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
    </section>
  );
}
