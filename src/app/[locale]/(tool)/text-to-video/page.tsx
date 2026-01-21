"use client";

import { getToolPageConfig } from "@/config/tool-pages";
import { ToolPageLayout } from "@/components/tool/tool-page-layout";

interface TextToVideoPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function TextToVideoPage({ params }: TextToVideoPageProps) {
  const config = getToolPageConfig("text-to-video");
  return <ToolPageLayout config={config} params={params} toolRoute="text-to-video" />;
}
