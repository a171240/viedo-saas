"use client";

import { useAction } from "next-safe-action/hooks";

import { Button } from "@/components/ui/button";
import * as Icons from "@/components/ui/icons";

import { createStripeSessionAction } from "@/actions/stripe";
import type { SubscriptionPlan, UserSubscriptionPlan } from "@/types";

interface BillingFormButtonProps {
  offer: SubscriptionPlan;
  subscriptionPlan: UserSubscriptionPlan;
  year: boolean;
  dict: Record<string, string>;
}

export function BillingFormButton({
  year,
  offer,
  dict,
  subscriptionPlan,
}: BillingFormButtonProps) {
  const { executeAsync, status } = useAction(createStripeSessionAction);
  const isPending = status === "executing";

  async function createSession(planId: string) {
    const res = await executeAsync({ planId });
    if (res?.data?.url) window.location.href = res.data.url;
  }

  const stripePlanId = year
    ? offer?.stripeIds?.yearly
    : offer?.stripeIds?.monthly;

  const stripeSessionAction = () => createSession(stripePlanId!);

  return (
    <Button
      variant="default"
      className="w-full"
      disabled={isPending}
      onClick={stripeSessionAction}
    >
      {isPending ? (
        <>
          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" /> Loading...
        </>
      ) : (
        <>
          {subscriptionPlan.stripePriceId
            ? dict.manage_subscription
            : dict.upgrade}
        </>
      )}
    </Button>
  );
}
