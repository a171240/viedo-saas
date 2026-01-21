"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImagePlay, Type, Video, FolderOpen, Gem, Settings, X } from "lucide-react";
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
  Settings,
};

interface SidebarProps {
  lang?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ lang = "en", mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  // Remove lang prefix from pathname for matching
  const pathWithoutLang = pathname.replace(new RegExp(`^/${lang}`), "");

  // Desktop navigation content (without SheetClose)
  const DesktopNavContent = () => (
    <nav className="p-4 space-y-6">
      {sidebarNavigation.map((group) => (
        <div key={group.id}>
          {group.title && (
            <div className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group.title}
            </div>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathWithoutLang === item.href;
              const Icon = iconMap[item.icon as keyof typeof iconMap];

              return (
                <li key={item.id}>
                  <Link
                    href={`/${lang}${item.href}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  // Mobile navigation content (with SheetClose)
  const MobileNavContent = () => (
    <nav className="p-4 space-y-6">
      {sidebarNavigation.map((group) => (
        <div key={group.id}>
          {group.title && (
            <div className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {group.title}
            </div>
          )}
          <ul className="space-y-1">
            {group.items.map((item) => {
              const isActive = pathWithoutLang === item.href;
              const Icon = iconMap[item.icon as keyof typeof iconMap];

              return (
                <li key={item.id}>
                  <SheetClose asChild>
                    <Link
                      href={`/${lang}${item.href}`}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                    </Link>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[200px] border-r border-border bg-background overflow-y-auto">
        <DesktopNavContent />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileOpen && (
        <Sheet open={mobileOpen} onOpenChange={onMobileClose ? () => onMobileClose() : undefined}>
          <SheetContent
            position="left"
            size="sm"
            className="w-[280px] p-0"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <span className="text-lg font-semibold">Menu</span>
                <SheetClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MobileNavContent />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
