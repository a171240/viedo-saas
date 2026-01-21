import { requireAdmin } from "@/lib/auth";

import { SiteFooter } from "@/components/site-footer";
import { i18n, type Locale } from "@/config/i18n-config";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  params: Promise<{
    lang: Locale;
  }>;
}

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { lang } = await params;
  await requireAdmin("/admin/login");

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
      </header>
      <div className="container grid flex-1 gap-12 ">
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <SiteFooter className="border-t" />
    </div>
  );
}
