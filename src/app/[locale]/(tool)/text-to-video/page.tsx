import { getToolPageConfig } from "@/config/tool-pages";
import { ToolPageLayout } from "@/components/tool/tool-page-layout";
import type { Locale } from "@/config/i18n-config";
import { Suspense } from "react";

interface TextToVideoPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function TextToVideoPage({ params }: TextToVideoPageProps) {
  const config = getToolPageConfig("text-to-video");
  const { locale } = await params;
  return (
    // ToolPageLayout uses `useSearchParams`, which requires a Suspense boundary for prerender.
    <Suspense fallback={null}>
      <ToolPageLayout
        config={config}
        locale={locale}
        toolRoute="text-to-video"
      />
    </Suspense>
  );
}
