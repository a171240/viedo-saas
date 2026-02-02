"use client";

import { useMemo, useState } from "react";
import Balancer from "react-wrap-balancer";
import { useTranslations, useLocale } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import * as Icons from "@/components/ui/icons";

import { BillingFormButton } from "@/components/price/billing-form-button";
import { priceDataMap, type SubscriptionPlanTranslation } from "@/config/price/price-data";
import { useSigninModal } from "@/hooks/use-signin-modal";
import { getLocalizedOnetimePackages, type CreditsDictionary } from "@/hooks/use-credit-packages";
import { getProductExpiryDays } from "@/config/credits";
import { LocaleLink } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { UserSubscriptionPlan } from "@/types";

interface PricingCardsProps {
  userId?: string;
  subscriptionPlan?: UserSubscriptionPlan;
  dictCredits: CreditsDictionary;
}

type PricingTab = "subscription" | "credits";

type PlanSpec = {
  label: string;
  included: boolean;
};

export function PricingCards({
  userId,
  subscriptionPlan,
  dictCredits,
}: PricingCardsProps) {
  const t = useTranslations("PricingCards");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<PricingTab>("subscription");
  const signInModal = useSigninModal();
  const pricingData = priceDataMap[locale] || priceDataMap.en;
  const buyCreditsLabel = dictCredits.buy_credits ?? t("buy_credits");

  const creditPackages = useMemo(
    () =>
      getLocalizedOnetimePackages(dictCredits).sort(
        (a, b) => a.credits - b.credits
      ),
    [dictCredits]
  );

  const buildPlanSpecs = (plan: {
    parallelTasks?: number;
    priorityQueue?: boolean;
    commercialUse?: boolean;
    noWatermark?: boolean;
  }): PlanSpec[] => {
    const yesLabel = t("yes");
    const noLabel = t("no");

    return [
      {
        label: `${t("parallel_tasks")}: ${plan.parallelTasks ?? 1}`,
        included: true,
      },
      {
        label: `${t("priority_queue")}: ${plan.priorityQueue ? yesLabel : noLabel}`,
        included: !!plan.priorityQueue,
      },
      {
        label: `${t("commercial_use")}: ${plan.commercialUse ? yesLabel : noLabel}`,
        included: !!plan.commercialUse,
      },
      {
        label: `${t("watermark")}: ${plan.noWatermark ? t("watermark_removed") : t("watermark_included")}`,
        included: !!plan.noWatermark,
      },
    ];
  };

  return (
    <section className="container flex flex-col items-center text-center">
      <div className="mx-auto mb-10 flex w-full flex-col gap-5">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t("pricing")}
        </p>
        <h2 className="font-heading text-3xl leading-[1.1] md:text-5xl">
          {t("slogan")}
        </h2>
      </div>

      <div className="mb-6 mx-auto flex justify-center">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <TabButton
            active={activeTab === "subscription"}
            onClick={() => setActiveTab("subscription")}
          >
            {t("subscription")}
          </TabButton>
          <TabButton
            active={activeTab === "credits"}
            onClick={() => setActiveTab("credits")}
          >
            {t("credit_packs")}
          </TabButton>
        </div>
      </div>

      {activeTab === "subscription" ? (
        <div className="mx-auto grid max-w-screen-lg gap-5 bg-inherit py-5 md:grid-cols-3 lg:grid-cols-3">
          {pricingData.map((offer: SubscriptionPlanTranslation) => {
            const planSpecs = buildPlanSpecs(offer);
            return (
              <div
                className="relative flex flex-col overflow-hidden rounded-xl border"
                key={offer.id}
              >
                <div className="min-h-[150px] items-start space-y-4 bg-secondary/70 p-6">
                  <p className="font-urban flex text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {offer.title}
                  </p>

                  <div className="flex flex-row">
                    <div className="flex items-end">
                      <div className="flex text-left text-3xl font-semibold leading-6">
                        {`$${offer.prices.monthly}`}
                      </div>
                      <div className="-mb-1 ml-2 text-left text-sm font-medium">
                        <div>{t("mo")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-left text-sm text-muted-foreground">
                    {t("credits_per_month", {
                      credits: offer.credits.toLocaleString(),
                    })}
                  </div>

                  {offer.prices.monthly > 0 ? (
                    <div className="text-left text-sm text-muted-foreground">
                      {t("monthly_info")}
                    </div>
                  ) : null}
                </div>

                <div className="flex h-full flex-col justify-between gap-16 p-6">
                  <ul className="space-y-2 text-left text-sm font-medium leading-normal">
                    {planSpecs.map((feature) => (
                      <li className="flex items-start" key={feature.label}>
                        {feature.included ? (
                          <Icons.Check className="mr-3 h-5 w-5 shrink-0" />
                        ) : (
                          <Icons.Close className="mr-3 h-5 w-5 shrink-0" />
                        )}
                        <p className={cn(feature.included ? "text-foreground" : "text-muted-foreground")}>
                          {feature.label}
                        </p>
                      </li>
                    ))}

                    {offer.benefits.map((feature) => (
                      <li className="flex items-start" key={feature}>
                        <Icons.Check className="mr-3 h-5 w-5 shrink-0" />
                        <p>{feature}</p>
                      </li>
                    ))}

                    {offer.limitations?.length > 0 &&
                      offer.limitations.map((feature) => (
                        <li
                          className="flex items-start text-muted-foreground"
                          key={feature}
                        >
                          <Icons.Close className="mr-3 h-5 w-5 shrink-0" />
                          <p>{feature}</p>
                        </li>
                      ))}
                  </ul>

                  {userId && subscriptionPlan ? (
                    offer.id === "starter" ? (
                      <LocaleLink
                        href="/my-creations"
                        className={buttonVariants({
                          className: "w-full",
                          variant: "default",
                        })}
                      >
                        {t("go_to_dashboard")}
                      </LocaleLink>
                    ) : (
                      <BillingFormButton
                        year={false}
                        offer={offer}
                        subscriptionPlan={subscriptionPlan}
                      />
                    )
                  ) : (
                    <Button onClick={signInModal.onOpen}>{t("signup")}</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto grid max-w-screen-lg gap-5 bg-inherit py-5 md:grid-cols-3 lg:grid-cols-3">
          {creditPackages.map((product) => {
            const expiryDays = getProductExpiryDays(product);
            const planSpecs = buildPlanSpecs(product);

            return (
              <div
                className="relative flex flex-col overflow-hidden rounded-xl border"
                key={product.id}
              >
                <div className="min-h-[150px] items-start space-y-4 bg-secondary/70 p-6">
                  <p className="font-urban flex text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {product.displayName}
                  </p>

                  <div className="flex flex-row">
                    <div className="flex items-end">
                      <div className="flex text-left text-3xl font-semibold leading-6">
                        {`$${(product.price.amount / 100).toFixed(product.price.amount % 100 === 0 ? 0 : 2)}`}
                      </div>
                      <div className="-mb-1 ml-2 text-left text-sm font-medium">
                        <div>{t("one_time")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-left text-sm text-muted-foreground">
                    {t("credits_one_time", {
                      credits: product.credits.toLocaleString(),
                    })}
                  </div>

                  <div className="text-left text-sm text-muted-foreground">
                    {t("credit_expiry", { days: expiryDays })}
                  </div>

                  {product.displayDescription ? (
                    <div className="text-left text-sm text-muted-foreground">
                      {product.displayDescription}
                    </div>
                  ) : null}
                </div>

                <div className="flex h-full flex-col justify-between gap-16 p-6">
                  <ul className="space-y-2 text-left text-sm font-medium leading-normal">
                    {planSpecs.map((feature) => (
                      <li className="flex items-start" key={feature.label}>
                        {feature.included ? (
                          <Icons.Check className="mr-3 h-5 w-5 shrink-0" />
                        ) : (
                          <Icons.Close className="mr-3 h-5 w-5 shrink-0" />
                        )}
                        <p className={cn(feature.included ? "text-foreground" : "text-muted-foreground")}>
                          {feature.label}
                        </p>
                      </li>
                    ))}

                    {product.localizedFeatures.map((feature) => (
                      <li className="flex items-start" key={feature}>
                        <Icons.Check className="mr-3 h-5 w-5 shrink-0" />
                        <p>{feature}</p>
                      </li>
                    ))}
                  </ul>

                  {userId ? (
                    <LocaleLink
                      href="/credits"
                      className={buttonVariants({
                        className: "w-full",
                        variant: "default",
                      })}
                    >
                      {buyCreditsLabel}
                    </LocaleLink>
                  ) : (
                    <Button onClick={signInModal.onOpen}>{t("signup")}</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-center text-base text-muted-foreground">
        <Balancer>
          {t("contact_email")}{" "}
          <a
            className="font-medium text-primary hover:underline"
            href="mailto:support@videofly.app"
          >
            support@videofly.app
          </a>{" "}
          {t("contact")}
          <br />
          <strong>{t("contact_2")}</strong>
        </Balancer>
      </p>
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
