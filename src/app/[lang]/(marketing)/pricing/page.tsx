import { getCurrentUser } from "@/lib/auth";

import { CreemPricing } from "@/components/price/creem-pricing";
import { PricingCards } from "@/components/price/pricing-cards";
import { PricingFaq } from "@/components/price/pricing-faq";
import { billingProvider } from "@/config/billing-provider";
import type { Locale } from "@/config/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { getUserPlans } from "@/services/billing";
import type { CreditsDictionary } from "@/hooks/use-credit-packages";
import type { UserSubscriptionPlan } from "@/types";

export const metadata = {
  title: "Pricing",
};

export default async function PricingPage({
  params,
}: {
  params: Promise<{
    lang: Locale;
  }>;
}) {
  const { lang } = await params;
  const user = await getCurrentUser();
  const dict = await getDictionary(lang);
  const fallbackDict = await getDictionary("en");
  const fallbackCredits = (fallbackDict as { credits: CreditsDictionary })
    .credits;
  const creditsDict =
    (dict as { credits?: CreditsDictionary }).credits ?? fallbackCredits;
  let subscriptionPlan: UserSubscriptionPlan | undefined;
  const isCreem = billingProvider === "creem";

  if (user && !isCreem) {
    subscriptionPlan = await getUserPlans(user.id);
  }
  return (
    <div className="flex w-full flex-col gap-16 py-8 md:py-8">
      {isCreem ? (
        <CreemPricing
          userId={user?.id}
          dictPrice={dict.price}
          dictCredits={creditsDict}
        />
      ) : (
        <PricingCards
          userId={user?.id}
          subscriptionPlan={subscriptionPlan}
          dict={dict.price}
          params={{ lang }}
        />
      )}
      <hr className="container" />
      <PricingFaq params={{ lang }} dict={dict.price} />
    </div>
  );
}
