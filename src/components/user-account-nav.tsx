"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

import { authClient, type User } from "@/lib/auth/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UserAvatar } from "@/components/user-avatar";
import { LocaleLink } from "@/i18n/navigation";

export function UserAccountNav({
  user,
}: {
  user: Pick<User, "name" | "image" | "email">;
}) {
  const t = useTranslations('UserAccountNav');
  const locale = useLocale();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <UserAvatar
          user={{ name: user.name ?? null, image: user.image ?? null }}
          className="h-8 w-8"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium">{user.name}</p>}
            {user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <LocaleLink href="/dashboard">{t('dashboard')}</LocaleLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <LocaleLink href="/dashboard/billing">{t('billing')}</LocaleLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <LocaleLink href="/dashboard/settings">{t('settings')}</LocaleLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onSelect={(event) => {
            event.preventDefault();
            authClient
              .signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push(`/${locale}/login`);
                  },
                },
              })
              .catch((error) => {
                console.error("Error during sign out:", error);
              });
          }}
        >
          {t('sign_out')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
