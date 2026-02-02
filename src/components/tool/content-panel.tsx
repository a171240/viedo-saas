"use client";

import { ArrowRight, Check, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface ContentPanelProps {
  lang?: string;
}

const exampleThumbnails = [
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80",
  "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
];

export function ContentPanel({ lang = "en" }: ContentPanelProps) {
  const t = useTranslations("ContentPanel");
  const exampleVideos = exampleThumbnails.map((thumbnail, index) => ({
    id: index,
    thumbnail,
    title: t(`examples.items.${index}`),
  }));
  const features = [
    t("features.items.0"),
    t("features.items.1"),
    t("features.items.2"),
    t("features.items.3"),
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Example Videos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {exampleVideos.map((video) => (
            <div
              key={video.id}
              className="group relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer"
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Play className="h-5 w-5 text-white fill-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-muted/30 rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t("features.title")}
          </h3>
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 text-primary" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            {t.rich("cta.note", {
              highlight: (chunks) => (
                <span className="font-semibold text-foreground">{chunks}</span>
              ),
            })}
          </p>
          <Link
            href={`/${lang}/login`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all"
          >
            {t("cta.button")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
