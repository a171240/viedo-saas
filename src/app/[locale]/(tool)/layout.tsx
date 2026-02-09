import { MobileMenuProvider } from "@/components/layout/mobile-menu-context";
import { ToolLayoutContent } from "@/components/layout/tool-layout-content";
import { getCurrentUser } from "@/lib/auth";

interface ToolLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
}

export default async function ToolLayout({
  children,
  params,
}: ToolLayoutProps) {
  const { locale } = await params;
  const user = await getCurrentUser();

  return (
    <MobileMenuProvider>
      <ToolLayoutContent lang={locale} user={user}>
        {children}
      </ToolLayoutContent>
    </MobileMenuProvider>
  );
}
