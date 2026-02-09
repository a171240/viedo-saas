"use client";

import * as React from "react";
import { useLocalePathname, useLocaleRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { stripLocalePrefix } from "@/i18n/strip-locale-prefix";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as Icons from "@/components/ui/icons";

import { i18n } from "@/config/i18n-config";

export function LocaleChange() {
  const router = useLocaleRouter();
  const pathname = useLocalePathname();
  const tLocale = useTranslations("Locale");

  const localeLabels: Record<string, string> = {
    en: tLocale("english"),
    zh: tLocale("chinese"),
  };

  function onClick(locale: string) {
    router.push(stripLocalePrefix(pathname), { locale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
          <Icons.Languages />
          <span className="sr-only" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div>
          {i18n.locales.map((locale) => {
            return (
              // <Link href={redirectedPathName(locale)}>{locale}</Link>
              <DropdownMenuItem key={locale} onClick={() => onClick(locale)}>
                <span>{localeLabels[locale] ?? locale}</span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
