"use client";

import { ArrowRight, Check, Sparkles, Video } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

import { BlurFade } from "@/components/magicui/blur-fade";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { BorderBeam } from "@/components/magicui/border-beam";
import { cn } from "@/components/ui";
import { marketingConfig } from "@/config/marketing";

/**
 * CTA Section - 行动号召区域
 *
 * 设计模式: Social Proof + CTA
 * - 用户头像展示社交证明
 * - Marquee 滚动展示评价
 * - Glassmorphism 风格卡片
 */

// 优势列表
const benefits = [
  { icon: Check, labelKey: "benefits.free", color: "text-green-500" },
  { icon: Check, labelKey: "benefits.noCard", color: "text-green-500" },
  { icon: Check, labelKey: "benefits.cancel", color: "text-green-500" },
  { icon: Check, labelKey: "benefits.support", color: "text-green-500" },
];

export function CTASection() {
  const t = useTranslations("CTA");
  const tMarketing = useTranslations("Marketing");

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
      </div>

      <div className="container mx-auto px-4">
        <div className="relative max-w-6xl mx-auto">
          {/* 主要 CTA 卡片 */}
          <BlurFade inView>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative rounded-3xl border border-white/20 dark:border-white/10 bg-white/80 dark:bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl"
            >
              {/* 边框光效 */}
              <BorderBeam
                size={400}
                duration={12}
                anchor={90}
                borderWidth={2}
                colorFrom="#3B82F6"
                colorTo="#A855F7"
              />

              {/* 顶部渐变装饰 */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

              <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
                {/* 左侧: 内容 */}
                <div className="space-y-6">
                  {/* 徽章 */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20"
                  >
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {t("badge")}
                    </span>
                  </motion.div>

                  {/* 标题 */}
                  <h2 className="text-3xl md:text-4xl font-bold">
                    {t("title")}
                    <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
                      {t("subtitle")}
                    </span>
                  </h2>

                  {/* 描述 */}
                  <p className="text-lg text-muted-foreground">
                    {t("description")}
                  </p>

                  {/* 优势列表 */}
                  <ul className="space-y-3">
                    {benefits.map((benefit, index) => {
                      const Icon = benefit.icon;
                      return (
                        <motion.li
                          key={benefit.labelKey}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center gap-3 text-muted-foreground"
                        >
                          <Icon className={cn("h-5 w-5 shrink-0", benefit.color)} />
                          <span>{t(benefit.labelKey)}</span>
                        </motion.li>
                      );
                    })}
                  </ul>

                  {/* CTA 按钮组 */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    <ShimmerButton
                      shimmerColor="#ffffff"
                      shimmerSize="0.05em"
                      shimmerDuration="3s"
                      borderRadius="100px"
                      background="linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)"
                      className="px-8 py-3 text-base font-medium shadow-lg shadow-blue-500/25"
                    >
                      {t("getStarted")}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </ShimmerButton>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-3 text-base font-medium rounded-full border-2 border-border bg-background/50 backdrop-blur-sm hover:bg-background/80 transition-all"
                    >
                      {t("learnMore")}
                    </motion.button>
                  </div>

                  {/* 社交证明 - 头像 */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-muted-foreground"
                  >
                    {tMarketing(marketingConfig.qualityNoteKey)}
                  </motion.p>
                </div>

                {/* 右侧: 预览卡片 */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* 装饰性光晕 */}
                  <div className="absolute -top-8 -right-8 w-48 h-48 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30 rounded-full blur-3xl -z-10" />
                  <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 rounded-full blur-2xl -z-10" />

                  {/* 视频预览卡片 */}
                  <div className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-black/30 backdrop-blur-sm overflow-hidden">
                    {/* 模拟视频播放器 */}
                    <div className="aspect-video bg-gradient-to-br from-muted/80 to-muted/60 flex items-center justify-center">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="relative"
                      >
                        {/* 播放按钮 */}
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg cursor-pointer">
                          <Video className="h-10 w-10 text-white" />
                        </div>
                        {/* 波纹动画 */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 animate-ping opacity-30" />
                      </motion.div>
                    </div>

                    {/* 模拟进度条 */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t("generating")}</span>
                        <span className="font-medium text-primary">100%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: "100%" }}
                          viewport={{ once: true }}
                          transition={{ duration: 2, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {t("readyIn")} {tMarketing(marketingConfig.typicalGenerationTimeKey)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </BlurFade>

          {/* 评价 Marquee */}
        </div>
      </div>
    </section>
  );
}
