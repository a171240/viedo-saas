"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { creem } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "@/components/ui/icons";

import { useSigninModal } from "@/hooks/use-signin-modal";
import {
  getLocalizedOnetimePackages,
  getLocalizedSubscriptionPackages,
  type CreditsDictionary,
  type LocalizedPackage,
} from "@/hooks/use-credit-packages";
import { getProductExpiryDays } from "@/config/credits";

interface DarkPricingProps {
  userId?: string;
  dictPrice: Record<string, string>;
  dictCredits: CreditsDictionary;
}

type PricingTab = "subscription" | "credit_packs";

type FeatureItem = {
  text: string;
  included: boolean;
};

type PlanSpec = {
  label: string;
  included: boolean;
};

function formatPrice(cents: number): string {
  const value = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${value}`;
}

function getStandardFeatures(products: LocalizedPackage[]): FeatureItem[] {
  const allFeatures = products.flatMap((p) => p.localizedFeatures);
  const uniqueFeatures = Array.from(new Set(allFeatures));

  return uniqueFeatures.map((feature) => ({
    text: feature,
    included: false,
  }));
}

export function DarkPricing({
  userId,
  dictPrice,
  dictCredits,
}: DarkPricingProps) {
  const t = useTranslations("PricingCards");
  const [activeTab, setActiveTab] = useState<PricingTab>("subscription");
  const [hasAccess, setHasAccess] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const signInModal = useSigninModal();

  const allSubscriptionProducts = useMemo(
    () =>
      getLocalizedSubscriptionPackages(dictCredits).sort(
        (a, b) => a.credits - b.credits
      ),
    [dictCredits]
  );

  const subscriptionProducts = useMemo(
    () =>
      allSubscriptionProducts.filter((p) => p.billingPeriod === "month"),
    [allSubscriptionProducts]
  );

  const onetimeProducts = useMemo(
    () =>
      getLocalizedOnetimePackages(dictCredits).sort(
        (a, b) => a.credits - b.credits
      ),
    [dictCredits]
  );

  const handleCheckout = (product: LocalizedPackage) => {
    if (!userId) {
      signInModal.onOpen();
      return;
    }

    startTransition(async () => {
      const origin = window.location.origin;
      const { data, error } = await creem.createCheckout({
        productId: product.id,
        successUrl: `${origin}/my-creations?payment=success`,
        metadata: {
          plan: product.id,
        },
      });

      if (error) {
        toast.error(t("toast.checkoutTitle"), {
          description: error.message ?? t("toast.checkoutDescription"),
        });
        return;
      }

      if (!data || !("url" in data) || !data.url) {
        toast.error(t("toast.checkoutTitle"), {
          description: t("toast.checkoutMissingUrl"),
        });
        return;
      }

      window.location.href = data.url;
    });
  };

  const handlePortal = async () => {
    const { data, error } = await creem.createPortal();
    if (error) {
      toast.error(t("toast.portalTitle"), {
        description: error.message ?? t("toast.portalDescription"),
      });
      return;
    }

    if (!data || !("url" in data) || !data.url) {
      toast.error(t("toast.portalTitle"), {
        description: t("toast.portalMissingUrl"),
      });
      return;
    }

    window.location.href = data.url;
  };

  const getCurrentProducts = () => {
    switch (activeTab) {
      case "subscription":
        return subscriptionProducts;
      case "credit_packs":
        return onetimeProducts;
      default:
        return [];
    }
  };

  const currentProducts = getCurrentProducts();
  const buyCreditsLabel = dictCredits.buy_credits ?? t("buy_credits");

  const standardFeatures = useMemo(() => {
    return getStandardFeatures(currentProducts);
  }, [currentProducts]);

  return (
    <section className="container mx-auto flex flex-col items-center text-center py-6 md:py-6">
      <div className="mb-6 mx-auto flex justify-center">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <TabButton
            active={activeTab === "subscription"}
            onClick={() => setActiveTab("subscription")}
          >
            {t("subscription")}
          </TabButton>
          <TabButton
            active={activeTab === "credit_packs"}
            onClick={() => setActiveTab("credit_packs")}
          >
            {t("credit_packs")}
          </TabButton>
        </div>
      </div>

      {currentProducts.length > 0 ? (
        <div className="mx-auto grid max-w-screen-lg gap-5 bg-inherit py-5 md:grid-cols-3 lg:grid-cols-3">
          {currentProducts.map((product, index) => {
            const isRecommended = index === 1 && currentProducts.length > 1;
            const isCurrent = activeProductId === product.id && hasAccess;

            const alignedFeatures = standardFeatures.map((feature) => ({
              ...feature,
              included: product.localizedFeatures.some((f) => f === feature.text),
            }));

            return (
              <PricingCard
                key={product.id}
                product={product}
                features={alignedFeatures}
                isRecommended={isRecommended}
                isCurrent={isCurrent}
                userId={userId}
                isPending={isPending}
                buyCreditsLabel={buyCreditsLabel}
                dictPrice={dictPrice}
                onCheckout={handleCheckout}
                onPortal={handlePortal}
                signInModal={signInModal}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          {t("no_products")}
        </div>
      )}
    </section>
  );
}

interface TabButtonProps {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}

function TabButton({ active, children, onClick }: TabButtonProps) {
  return (
    <button type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-md px-6 py-2.5 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-md scale-105"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

interface PricingCardProps {
  product: LocalizedPackage;
  features: FeatureItem[];
  isRecommended: boolean;
  isCurrent: boolean;
  userId?: string;
  isPending: boolean;
  buyCreditsLabel: string;
  dictPrice: Record<string, string>;
  onCheckout: (product: LocalizedPackage) => void;
  onPortal: () => void;
  signInModal: { onOpen: () => void };
}

function PricingCard({
  product,
  features,
  isRecommended,
  isCurrent,
  userId,
  isPending,
  buyCreditsLabel,
  dictPrice,
  onCheckout,
  onPortal,
  signInModal,
}: PricingCardProps) {
  const t = useTranslations("PricingCards");

  const buildPlanSpecs = (): PlanSpec[] => {
    const yesLabel = t("yes");
    const noLabel = t("no");

    return [
      {
        label: `${t("parallel_tasks")}: ${product.parallelTasks ?? 1}`,
        included: true,
      },
      {
        label: `${t("commercial_use")}: ${product.commercialUse ? yesLabel : noLabel}`,
        included: !!product.commercialUse,
      },
      {
        label: `${t("watermark")}: ${product.noWatermark ? t("watermark_removed") : t("watermark_included")}`,
        included: !!product.noWatermark,
      },
    ];
  };

  const planSpecs = buildPlanSpecs();
  const expiryDays = product.type === "one-time" ? getProductExpiryDays(product) : null;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-xl border",
        isRecommended && "border-primary"
      )}
    >
      <div className="min-h-[150px] items-start space-y-4 bg-secondary/30 p-6">
        <p className="font-urban flex text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {product.displayName}
        </p>

        <div className="flex flex-row">
          <div className="flex items-end gap-2">
            <div className="flex text-left text-3xl font-semibold leading-6">
              {formatPrice(product.price.amount)}
            </div>
            <div className="-mb-1 ml-2 text-left text-sm font-medium text-muted-foreground">
              {product.type === "subscription"
                ? product.billingPeriod === "year"
                  ? t("per_year")
                  : t("per_month")
                : t("one_time")}
            </div>
          </div>
        </div>

        {product.credits ? (
          <div className="text-left text-sm text-muted-foreground">
            {product.type === "subscription"
              ? t("credits_per_month", { credits: product.credits.toLocaleString() })
              : t("credits_one_time", { credits: product.credits.toLocaleString() })}
          </div>
        ) : null}

        {expiryDays ? (
          <div className="text-left text-sm text-muted-foreground">
            {t("credit_expiry", { days: expiryDays })}
          </div>
        ) : null}

        {product.displayDescription ? (
          <div className="text-left text-sm text-muted-foreground">
            {product.displayDescription}
          </div>
        ) : null}
      </div>

      <div className="flex h-full flex-col justify-between gap-10 p-6">
        <ul className="space-y-2 text-left text-sm font-medium leading-normal">
          {planSpecs.map((feature) => (
            <li className="flex items-start" key={feature.label}>
              {feature.included ? (
                <Icons.Check className="mr-3 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Icons.Close className="mr-3 h-5 w-5 shrink-0 text-destructive" />
              )}
              <p className={cn(feature.included ? "text-foreground" : "text-muted-foreground")}>
                {feature.label}
              </p>
            </li>
          ))}

          {features.map((feature, idx) => (
            <li className="flex items-start" key={idx}>
              {feature.included ? (
                <Icons.Check className="mr-3 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Icons.Close className="mr-3 h-5 w-5 shrink-0 text-destructive" />
              )}
              <p className={cn(feature.included ? "text-foreground" : "text-muted-foreground")}>
                {feature.text}
              </p>
            </li>
          ))}
        </ul>

        {userId ? (
          isCurrent ? (
            <button type="button"
              onClick={onPortal}
              className={cn(
                "w-full rounded-lg py-2.5 text-sm font-semibold transition-colors",
                "hover:opacity-90",
                isRecommended
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {dictPrice.manage_subscription}
            </button>
          ) : (
            <button type="button"
              disabled={isPending}
              onClick={() => onCheckout(product)}
              className={cn(
                "w-full rounded-lg py-2.5 text-sm font-semibold transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "hover:opacity-90",
                isRecommended
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {isPending ? (
                <>
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t("loading")}
                </>
              ) : product.billingPeriod ? (
                dictPrice.upgrade
              ) : (
                buyCreditsLabel
              )}
            </button>
          )
        ) : (
          <button type="button"
            onClick={signInModal.onOpen}
            className={cn(
              "w-full rounded-lg py-2.5 text-sm font-semibold transition-colors",
              "hover:opacity-90",
              isRecommended
                ? "bg-primary text-primary-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {dictPrice.signup}
          </button>
        )}
      </div>
    </div>
  );
}
