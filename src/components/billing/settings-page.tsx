"use client";

// ============================================
// Settings Page (Billing Only)
// ============================================

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail, IdCard, Calendar } from "lucide-react";
import { useBilling } from "@/hooks/use-billing";
import { useBrandKit } from "@/hooks/use-brand-kit";
import { AvatarFallback } from "@/components/user/avatar-fallback";
import { BillingList } from "@/components/billing";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND_KIT_DURATION_OPTIONS, BRAND_KIT_RATIO_OPTIONS } from "@/config/brand-kit";
import { formatDistanceToNow } from "date-fns";
import { getDateFnsLocale } from "@/lib/date-locale";

interface SettingsPageProps {
  locale: string;
  userEmail?: string;
  userId?: string;
}

export function SettingsPage({ locale, userEmail, userId }: SettingsPageProps) {
  const t = useTranslations("dashboard.settings");
  const activeLocale = useLocale();
  const dateLocale = getDateFnsLocale(activeLocale);
  const { brandKit, updateBrandKit } = useBrandKit();

  const {
    user,
    invoices,
    hasMore,
    fetchNextPage,
    isLoading,
  } = useBilling();

  // Infinite scroll observer
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    const current = observerTarget.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [hasMore, isLoading, fetchNextPage]);

  // Use data from hook if available, otherwise use props
  const displayEmail = user?.email || userEmail;
  const displayUserId = user?.id || userId;
  const joinedDate = user?.createdAt ? new Date(user.createdAt) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      {/* Account Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <AvatarFallback
              name={displayEmail}
              email={displayEmail}
              className="h-16 w-16 text-xl"
            />

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{t("account")}</div>
                <h2 className="text-lg font-semibold">{t("account")}</h2>
              </div>

              <div className="space-y-3">
                {/* Email */}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("email")}:</span>
                  <span className="font-medium">{displayEmail}</span>
                </div>

                {/* User ID */}
                {displayUserId && (
                  <div className="flex items-center gap-3 text-sm">
                    <IdCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("userId")}:</span>
                    <span className="font-medium font-mono">{displayUserId}</span>
                  </div>
                )}

                {/* Joined Date */}
                {joinedDate && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("joined")}:</span>
                    <span className="font-medium">
                      {formatDistanceToNow(joinedDate, {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Kit */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">{t("brandKit.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("brandKit.description")}</p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <div className="text-sm font-medium">{t("brandKit.enabled")}</div>
              <p className="text-xs text-muted-foreground">{t("brandKit.enabledHint")}</p>
            </div>
            <Switch
              checked={brandKit.enabled}
              onCheckedChange={(checked) => updateBrandKit({ enabled: checked })}
              aria-label={t("brandKit.enabled")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("brandKit.brandTone")}</Label>
              <Input
                value={brandKit.brandTone}
                onChange={(event) => updateBrandKit({ brandTone: event.target.value })}
                placeholder={t("brandKit.brandTonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("brandKit.styleSuffix")}</Label>
              <Input
                value={brandKit.styleSuffix}
                onChange={(event) => updateBrandKit({ styleSuffix: event.target.value })}
                placeholder={t("brandKit.styleSuffixPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("brandKit.bannedWords")}</Label>
            <Textarea
              value={brandKit.bannedWords}
              onChange={(event) => updateBrandKit({ bannedWords: event.target.value })}
              placeholder={t("brandKit.bannedWordsPlaceholder")}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{t("brandKit.bannedWordsHint")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("brandKit.defaultRatio")}</Label>
              <Select
                value={brandKit.defaultAspectRatio || "none"}
                onValueChange={(value) =>
                  updateBrandKit({ defaultAspectRatio: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("brandKit.noDefault")}</SelectItem>
                  {BRAND_KIT_RATIO_OPTIONS.map((ratio) => (
                    <SelectItem key={ratio} value={ratio}>
                      {ratio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("brandKit.defaultDuration")}</Label>
              <Select
                value={brandKit.defaultDuration ? String(brandKit.defaultDuration) : "none"}
                onValueChange={(value) =>
                  updateBrandKit({ defaultDuration: value === "none" ? undefined : Number(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("brandKit.noDefault")}</SelectItem>
                  {BRAND_KIT_DURATION_OPTIONS.map((seconds) => (
                    <SelectItem key={seconds} value={String(seconds)}>
                      {t("brandKit.durationOption", { seconds })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("brandKit.defaultDurationHint")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <BillingList
        invoices={invoices}
        hasMore={hasMore}
        onLoadMore={() => fetchNextPage()}
      />

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={observerTarget} className="py-4" />}
    </div>
  );
}
