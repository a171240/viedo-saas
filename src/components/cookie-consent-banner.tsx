"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { readCookieConsent, writeCookieConsent } from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const t = useTranslations("CookieConsent");
  const locale = useLocale();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  useEffect(() => {
    const consent = readCookieConsent();
    if (consent) {
      setHasConsent(true);
      setAnalyticsEnabled(consent.analytics);
    } else {
      setHasConsent(false);
      setAnalyticsEnabled(false);
    }
  }, []);

  const saveConsent = (analytics: boolean) => {
    writeCookieConsent(analytics);
    setAnalyticsEnabled(analytics);
    setHasConsent(true);
  };

  if (hasConsent !== false) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="text-base font-semibold">{t("title")}</div>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <Link
            className="text-sm text-primary underline-offset-4 hover:underline"
            href={`/${locale}/cookies`}
          >
            {t("learnMore")}
          </Link>
        </div>

        <div className="flex w-full flex-col gap-4 md:max-w-md">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
            <div>
              <div className="text-sm font-medium">{t("necessary.title")}</div>
              <div className="text-xs text-muted-foreground">
                {t("necessary.description")}
              </div>
            </div>
            <Switch checked disabled aria-label={t("necessary.title")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/70 px-3 py-2">
            <div>
              <div className="text-sm font-medium">{t("analytics.title")}</div>
              <div className="text-xs text-muted-foreground">
                {t("analytics.description")}
              </div>
            </div>
            <Switch
              checked={analyticsEnabled}
              onCheckedChange={setAnalyticsEnabled}
              aria-label={t("analytics.title")}
            />
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button variant="outline" onClick={() => saveConsent(false)}>
              {t("rejectAnalytics")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => saveConsent(analyticsEnabled)}
            >
              {t("savePreferences")}
            </Button>
            <Button onClick={() => saveConsent(true)}>{t("acceptAll")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
