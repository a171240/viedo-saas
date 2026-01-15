"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Balancer from "react-wrap-balancer";

import { creem } from "@videofly/auth/client";
import { Button, buttonVariants } from "@videofly/ui/button";
import * as Icons from "@videofly/ui/icons";
import { Switch } from "@videofly/ui/switch";
import { cn } from "@videofly/ui";
import { toast } from "@videofly/ui/use-toast";

import { useSigninModal } from "~/hooks/use-signin-modal";
import {
  canPurchasePackages,
  getLocalizedOnetimePackages,
  getLocalizedSubscriptionPackages,
  type CreditsDictionary,
  type LocalizedPackage,
} from "~/hooks/use-credit-packages";

type BillingPeriod = "month" | "year";

interface CreemPricingProps {
  userId?: string;
  dictPrice: Record<string, string>;
  dictCredits: CreditsDictionary;
}

function formatPrice(cents: number): string {
  const value = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${value}`;
}

function resolveCheckoutUrl(data?: {
  url?: string;
  checkoutUrl?: string;
}) {
  return data?.url ?? data?.checkoutUrl;
}

function resolvePortalUrl(data?: { url?: string; portalUrl?: string }) {
  return data?.url ?? data?.portalUrl;
}

export function CreemPricing({
  userId,
  dictPrice,
  dictCredits,
}: CreemPricingProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("month");
  const [hasAccess, setHasAccess] = useState(false);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const signInModal = useSigninModal();

  const subscriptionProducts = useMemo(
    () =>
      getLocalizedSubscriptionPackages(dictCredits).sort(
        (a, b) => a.credits - b.credits
      ),
    [dictCredits]
  );
  const onetimeProducts = useMemo(
    () =>
      getLocalizedOnetimePackages(dictCredits).sort(
        (a, b) => a.credits - b.credits
      ),
    [dictCredits]
  );

  const visibleSubscriptions = subscriptionProducts.filter((product) => {
    const period = product.billingPeriod ?? "month";
    return period === billingPeriod;
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setIsCheckingAccess(true);

    creem
      .hasAccessGranted()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Creem access check failed:", error);
          return;
        }
        setHasAccess(!!data?.hasAccess);
        setActiveProductId(data?.product?.id ?? null);
      })
      .finally(() => {
        if (active) setIsCheckingAccess(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const handleCheckout = (product: LocalizedPackage) => {
    if (!userId) {
      signInModal.onOpen();
      return;
    }

    startTransition(async () => {
      const origin = window.location.origin;
      const { data, error } = await creem.createCheckout({
        productId: product.id,
        successUrl: `${origin}/dashboard/videos?payment=success`,
        cancelUrl: `${origin}/pricing`,
        metadata: {
          plan: product.id,
        },
      });

      if (error) {
        toast({
          title: "Checkout error",
          description: error.message ?? "Failed to create checkout session.",
          variant: "destructive",
        });
        return;
      }

      const checkoutUrl = resolveCheckoutUrl(data);
      if (!checkoutUrl) {
        toast({
          title: "Checkout error",
          description: "Missing checkout URL from Creem.",
          variant: "destructive",
        });
        return;
      }

      window.location.href = checkoutUrl;
    });
  };
  const buyCreditsLabel = dictCredits.buy_credits ?? "Buy Credits";

  const handlePortal = async () => {
    const { data, error } = await creem.createPortal();
    if (error) {
      toast({
        title: "Portal error",
        description: error.message ?? "Failed to open customer portal.",
        variant: "destructive",
      });
      return;
    }

    const portalUrl = resolvePortalUrl(data);
    if (!portalUrl) {
      toast({
        title: "Portal error",
        description: "Missing portal URL from Creem.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = portalUrl;
  };

  return (
    <section className="container flex flex-col items-center text-center">
      <div className="mx-auto mb-10 flex w-full flex-col gap-5">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {dictPrice.pricing}
        </p>
        <h2 className="font-heading text-3xl leading-[1.1] md:text-5xl">
          {dictPrice.slogan}
        </h2>
      </div>

      <div className="mb-4 flex items-center gap-5">
        <span>{dictPrice.monthly_bill}</span>
        <Switch
          checked={billingPeriod === "year"}
          onCheckedChange={(checked) =>
            setBillingPeriod(checked ? "year" : "month")
          }
          role="switch"
          aria-label="switch-year"
        />
        <span>{dictPrice.annual_bill}</span>
      </div>

      <div className="mx-auto grid max-w-screen-lg gap-5 bg-inherit py-5 md:grid-cols-3 lg:grid-cols-3">
        {visibleSubscriptions.map((product) => {
          const isCurrent = activeProductId === product.id && hasAccess;

          return (
            <div
              className="relative flex flex-col overflow-hidden rounded-xl border"
              key={product.id}
            >
              <div className="min-h-[150px] items-start space-y-4 bg-secondary/70 p-6">
                <p className="font-urban flex text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  {product.displayName}
                </p>

                <div className="flex items-end gap-2">
                  <div className="flex text-left text-3xl font-semibold leading-6">
                    {formatPrice(product.price.amount)}
                  </div>
                  <div className="-mb-1 text-left text-sm font-medium text-muted-foreground">
                    {billingPeriod === "year" ? "/yr" : dictPrice.mo}
                  </div>
                </div>

                {product.displayDescription ? (
                  <div className="text-left text-sm text-muted-foreground">
                    {product.displayDescription}
                  </div>
                ) : null}
              </div>

              <div className="flex h-full flex-col justify-between gap-10 p-6">
                <ul className="space-y-2 text-left text-sm font-medium leading-normal">
                  {product.localizedFeatures.map((feature) => (
                    <li className="flex items-start" key={feature}>
                      <Icons.Check className="mr-3 h-5 w-5 shrink-0" />
                      <p>{feature}</p>
                    </li>
                  ))}
                </ul>

                {userId ? (
                  isCurrent ? (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={handlePortal}
                    >
                      {dictPrice.manage_subscription}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full"
                      disabled={isPending || isCheckingAccess}
                      onClick={() => handleCheckout(product)}
                    >
                      {isPending ? (
                        <>
                          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        dictPrice.upgrade
                      )}
                    </Button>
                  )
                ) : (
                  <Button onClick={signInModal.onOpen}>{dictPrice.signup}</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-screen-lg flex-col gap-6 text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{buyCreditsLabel}</h3>
          {!canPurchasePackages(hasAccess) && userId ? (
            <span className="text-sm text-muted-foreground">
              {dictPrice.upgrade}
            </span>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-3">
          {onetimeProducts.map((product) => {
            const purchaseDisabled =
              userId && !canPurchasePackages(hasAccess);

            return (
              <div
                className="relative flex flex-col overflow-hidden rounded-xl border"
                key={product.id}
              >
                <div className="min-h-[140px] items-start space-y-4 bg-secondary/70 p-6">
                  <p className="font-urban text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    {product.displayName}
                  </p>
                  <div className="flex items-end gap-2">
                    <div className="flex text-left text-3xl font-semibold leading-6">
                      {formatPrice(product.price.amount)}
                    </div>
                  </div>
                  {product.displayDescription ? (
                    <div className="text-left text-sm text-muted-foreground">
                      {product.displayDescription}
                    </div>
                  ) : null}
                </div>

                <div className="flex h-full flex-col justify-between gap-10 p-6">
                  <ul className="space-y-2 text-left text-sm font-medium leading-normal">
                    {product.localizedFeatures.map((feature) => (
                      <li className="flex items-start" key={feature}>
                        <Icons.Check className="mr-3 h-5 w-5 shrink-0" />
                        <p>{feature}</p>
                      </li>
                    ))}
                  </ul>

                  {userId ? (
                    <Button
                      variant="default"
                      className="w-full"
                      disabled={purchaseDisabled || isPending}
                      onClick={() => handleCheckout(product)}
                    >
                      {isPending ? (
                        <>
                          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        buyCreditsLabel
                      )}
                    </Button>
                  ) : (
                    <Button onClick={signInModal.onOpen}>{dictPrice.signup}</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-10 text-center text-base text-muted-foreground">
        <Balancer>
          Email{" "}
          <a
            className={cn(buttonVariants({ variant: "link", className: "p-0" }))}
            href="mailto:support@videofly.io"
          >
            support@videofly.io
          </a>{" "}
          {dictPrice.contact}
          <br />
          <strong>{dictPrice.contact_2}</strong>
        </Balancer>
      </p>
    </section>
  );
}
