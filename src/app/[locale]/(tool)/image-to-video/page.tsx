"use client";

import { getToolPageConfig } from "@/config/tool-pages";
import { ToolPageLayout } from "@/components/tool/tool-page-layout";

interface ImageToVideoPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function ImageToVideoPage({ params }: ImageToVideoPageProps) {
  const config = getToolPageConfig("image-to-video");
  return <ToolPageLayout config={config} params={params} toolRoute="image-to-video" />;
}
