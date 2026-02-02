import { getTranslations } from "next-intl/server";
import type { Locale } from "@/config/i18n-config";

interface ModelPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export async function generateMetadata({ params }: ModelPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ModelPages" });
  return {
    title: `${t("sora2.title")} - VideoFly`,
    description: t("comingSoon"),
  };
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ModelPages" });

  return (
    <div className="container mx-auto px-4 py-20">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">
          {t("sora2.title")}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          {t("comingSoon")}
        </p>
        <div className="flex justify-center gap-4">
          <a
            href={`/${locale}/image-to-video`}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t("tryImageToVideo")}
          </a>
          <a
            href={`/${locale}/text-to-video`}
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            {t("tryTextToVideo")}
          </a>
        </div>
      </div>
    </div>
  );
}
