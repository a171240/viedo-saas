import { getToolPageConfig } from "@/config/tool-pages";
import { ToolPageLayout } from "@/components/tool/tool-page-layout";
import type { Locale } from "@/config/i18n-config";
import { Suspense } from "react";

interface ReferenceToVideoPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function ReferenceToVideoPage({ params }: ReferenceToVideoPageProps) {
  const config = getToolPageConfig("reference-to-video");
  const { locale } = await params;
  return (
    // ToolPageLayout uses `useSearchParams`, which requires a Suspense boundary for prerender.
    <Suspense fallback={null}>
      <ToolPageLayout
        config={config}
        locale={locale}
        toolRoute="reference-to-video"
      />
    </Suspense>
  );
}
