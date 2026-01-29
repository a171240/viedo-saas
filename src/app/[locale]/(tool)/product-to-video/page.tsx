import type { Locale } from "@/config/i18n-config";
import { ProductToVideoPage } from "@/components/product-to-video/product-to-video-page";

interface ProductToVideoPageProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function ProductToVideoRoute({ params }: ProductToVideoPageProps) {
  const { locale } = await params;
  return <ProductToVideoPage locale={locale} />;
}
