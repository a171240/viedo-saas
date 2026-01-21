import { getCurrentUser } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

import { CreemPricing } from "@/components/price/creem-pricing";
import { PricingCards } from "@/components/price/pricing-cards";
import { PricingFaq } from "@/components/price/pricing-faq";
import { billingProvider } from "@/config/billing-provider";
import { getUserPlans } from "@/services/billing";
import type { CreditsDictionary } from "@/hooks/use-credit-packages";
import type { UserSubscriptionPlan } from "@/types";

export const metadata = {
  title: "Pricing",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  let subscriptionPlan: UserSubscriptionPlan | undefined;
  const isCreem = billingProvider === "creem";

  if (user && !isCreem) {
    subscriptionPlan = await getUserPlans(user.id);
  }

  // Get translations
  const t = await getTranslations();
  const dictPrice = t.raw('PricingCards') as Record<string, string>;
  const dictCredits = t.raw('Credits') as CreditsDictionary;

  return (
    <div className="flex w-full flex-col gap-16 py-8 md:py-8">
      {isCreem ? (
        <CreemPricing
          userId={user?.id}
          dictPrice={dictPrice}
          dictCredits={dictCredits}
        />
      ) : (
        <PricingCards
          userId={user?.id}
          subscriptionPlan={subscriptionPlan}
        />
      )}
      <hr className="container" />
      <PricingFaq />
    </div>
  );
}
