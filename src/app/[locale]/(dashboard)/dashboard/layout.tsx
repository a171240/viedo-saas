import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth";

import { LocaleChange } from "@/components/locale-change";
import { MainNav } from "@/components/main-nav";
import { DashboardNav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { UserAccountNav } from "@/components/user-account-nav";
import { i18n, type Locale } from "@/config/i18n-config";
import { getDashboardConfig } from "@/config/ui/dashboard";

interface DashboardLayoutProps {
  children?: React.ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;
  const user = await requireAuth(`/${locale}/login`);
  const dashboardConfig = await getDashboardConfig({ params: { lang: locale } });
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav items={dashboardConfig.mainNav} />
          <div className="flex items-center space-x-3">
            <LocaleChange url={"/dashboard"} />
            <UserAccountNav
              user={{
                name: user.name,
                image: user.image,
                email: user.email,
              }}
            />
          </div>
        </div>
      </header>
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
        <aside className="hidden w-[200px] flex-col md:flex">
          <DashboardNav
            items={dashboardConfig.sidebarNav}
            params={{ lang: `${locale}` }}
          />
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
      <SiteFooter className="border-t border-border" />
    </div>
  );
}
