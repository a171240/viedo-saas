"use client";

// ============================================
// 左侧导航组件
// ============================================

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImagePlay, Type, Video, FolderOpen, Gem, User, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui";
import { sidebarNavigation } from "@/config/navigation";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";

const iconMap = {
  ImagePlay,
  Type,
  Video,
  FolderOpen,
  Gem,
  User,
};

interface SidebarProps {
  lang?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ lang = "en", mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const pathWithoutLang = pathname.replace(new RegExp(`^/${lang}`), "");
  const t = useTranslations("Sidebar");

  // 判断是否为免费用户（可根据实际业务调整）
  const isFreeUser = useMemo(() => true, []);

  // 渲染导航项
  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = iconMap[item.icon as keyof typeof iconMap];

    return (
      <Link
        key={item.id}
        href={`/${lang}${item.href}`}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{item.title}</span>
      </Link>
    );
  };

  // Desktop Sidebar
  const DesktopNav = () => (
    <div className="flex flex-col h-full py-4">
      {/* 主导航 */}
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        {sidebarNavigation.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.title && (
              <div className="px-2 mb-2 text-xs font-medium text-muted-foreground">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathWithoutLang === item.href;
                return renderNavItem(item, isActive);
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 底部升级区域 */}
      {isFreeUser && (
        <div className="px-3 pt-4 border-t border-border/50">
          <Link
            href={`/${lang}/pricing`}
            className="group relative block overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-3 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/30"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-2xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-8 left-4 h-16 w-16 rounded-full bg-primary/15 blur-2xl"
            />
            <div className="relative flex items-center gap-2 mb-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-foreground">
                {t("upgradeTitle")}
              </span>
            </div>
            <p className="relative text-xs text-muted-foreground">
              {t("upgradeSubtitle")}
            </p>
          </Link>
        </div>
      )}
    </div>
  );

  // Mobile Nav
  const MobileNav = () => (
    <div className="flex flex-col h-full py-4">
      <nav className="flex-1 px-3 space-y-6 overflow-y-auto">
        {sidebarNavigation.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.title && (
              <div className="px-2 mb-2 text-xs font-medium text-muted-foreground">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathWithoutLang === item.href;
                return (
                  <SheetClose key={item.id} asChild>
                    <Link
                      href={`/${lang}${item.href}`}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {(() => {
                        const Icon = iconMap[item.icon as keyof typeof iconMap];
                        return Icon && <Icon className="h-4 w-4 shrink-0" />;
                      })()}
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 移动端升级区域 */}
      {isFreeUser && (
        <div className="px-3 pt-4 border-t border-border/50">
          <SheetClose asChild>
            <Link
              href={`/${lang}/pricing`}
              onClick={onMobileClose}
              className="group relative block overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-3 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/30"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-2xl"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-8 left-4 h-16 w-16 rounded-full bg-primary/15 blur-2xl"
              />
              <div className="relative flex items-center gap-2 mb-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {t("upgradeTitle")}
                </span>
              </div>
              <p className="relative text-xs text-muted-foreground">
                {t("upgradeSubtitle")}
              </p>
            </Link>
          </SheetClose>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[200px] border-r border-border bg-background">
        <DesktopNav />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <Sheet open={mobileOpen} onOpenChange={onMobileClose ? () => onMobileClose() : undefined}>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="flex flex-col h-full">
              <MobileNav />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
