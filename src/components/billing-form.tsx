"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as Icons from "@/components/ui/icons";
import { toast } from "sonner";

import { formatDate } from "@/lib/utils";
import { UserSubscriptionPlan } from "@/types";

interface BillingFormProps extends React.HTMLAttributes<HTMLFormElement> {
  subscriptionPlan: UserSubscriptionPlan & {
    isCanceled: boolean;
  };
}

export function BillingForm({
  subscriptionPlan,
  className,
  ...props
}: BillingFormProps) {
  const t = useTranslations("BillingForm");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  async function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setIsLoading(!isLoading);

    // Get a Stripe session URL.
    const response = await fetch("/api/users/stripe");

    if (!response?.ok) {
      return toast.error(t("errors.genericTitle"), {
        description: t("errors.genericDescription"),
      });
    }

    // Redirect to the Stripe session.
    // This could be a checkout page for initial upgrade.
    // Or portal to manage existing subscription.
    const session = await response.json();
    if (session) {
      window.location.href = session.url;
    }
  }

  return (
    <form className={cn(className)} onSubmit={onSubmit} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("currentPlan", { plan: subscriptionPlan?.title ?? "" })}
          </CardDescription>
        </CardHeader>
        <CardContent>{subscriptionPlan?.description}</CardContent>
        <CardFooter className="flex flex-col items-start space-y-2 md:flex-row md:justify-between md:space-x-0">
          <button
            type="submit"
            className={cn(buttonVariants())}
            disabled={isLoading}
          >
            {isLoading && (
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {subscriptionPlan?.isPaid
              ? t("actions.manageSubscription")
              : t("actions.upgradePro")}
          </button>
          {subscriptionPlan?.isPaid ? (
            <p className="rounded-full text-xs font-medium">
              {subscriptionPlan?.isCanceled
                ? t("status.cancelsOn")
                : t("status.renewsOn")}
              {formatDate(subscriptionPlan?.stripeCurrentPeriodEnd)}.
            </p>
          ) : null}
        </CardFooter>
      </Card>
    </form>
  );
}
