import { Suspense } from "react";

import { getCurrentUser } from "@/lib/auth";

import { NavBar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import type { Locale } from "@/config/i18n-config";
import { getMarketingConfig } from "@/config/ui/marketing";

interface DocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function DocsLayout({
  children,
  params,
}: DocsLayoutProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback="...">
        <NavBar
          items={
            (await getMarketingConfig({ params: { lang: `${locale}` } })).mainNav
          }
          scroll={true}
          user={user ?? undefined}
        />
      </Suspense>
      <div className="container flex-1">{children}</div>
      <SiteFooter className="border-t" />
    </div>
  );
}
