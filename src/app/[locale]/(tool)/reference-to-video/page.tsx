"use client";

import { getToolPageConfig } from "@/config/tool-pages";
import { ToolPageLayout } from "@/components/tool/tool-page-layout";

interface ReferenceToVideoPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function ReferenceToVideoPage({ params }: ReferenceToVideoPageProps) {
  const config = getToolPageConfig("reference-to-video");
  return <ToolPageLayout config={config} params={params} toolRoute="reference-to-video" />;
}
