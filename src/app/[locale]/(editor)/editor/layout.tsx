import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import { MainNav } from "@/components/main-nav";
import { DashboardNav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { UserAccountNav } from "@/components/user-account-nav";
import type { Locale } from "@/config/i18n-config";
import { getDashboardConfig } from "@/config/ui/dashboard";

interface EditLayoutProps {
  children?: React.ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}

export default async function DashboardLayout({
  children,
  params,
}: EditLayoutProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  const dashboardConfig = await getDashboardConfig({ params: { lang: locale } });
  if (!user) {
    return notFound();
  }

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav items={dashboardConfig.mainNav} />
          <UserAccountNav
            user={{
              name: user.name,
              image: user.image,
              email: user.email,
            }}
          />
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
      <SiteFooter className="border-t" />
    </div>
  );
}
