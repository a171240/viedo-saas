import { MobileMenuProvider } from "@/components/layout/mobile-menu-context";
import { ToolLayoutContent } from "@/components/layout/tool-layout-content";
import { i18n, type Locale } from "@/config/i18n-config";
import type { User } from "@/lib/auth";

interface ToolLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: Locale;
  }>;
}

export function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

async function getUser(): Promise<any> {
  try {
    const { authClient } = await import("@/lib/auth/client");
    const session = await authClient.getSession();
    return session?.data?.user ?? null;
  } catch {
    return null;
  }
}

export default async function ToolLayout({
  children,
  params,
}: ToolLayoutProps) {
  const { locale } = await params;
  const user = await getUser();

  return (
    <MobileMenuProvider>
      <ToolLayoutContent lang={locale} user={user}>
        {children}
      </ToolLayoutContent>
    </MobileMenuProvider>
  );
}
