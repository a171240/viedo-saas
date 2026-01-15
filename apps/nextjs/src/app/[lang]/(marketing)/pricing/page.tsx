import { getCurrentUser } from "@videofly/auth";

import { CreemPricing } from "~/components/price/creem-pricing";
import { PricingCards } from "~/components/price/pricing-cards";
import { PricingFaq } from "~/components/price/pricing-faq";
import { billingProvider } from "~/config/billing-provider";
import type { Locale } from "~/config/i18n-config";
import { getDictionary } from "~/lib/get-dictionary";
import { trpc } from "~/trpc/server";

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
  const fallbackCredits = dict.credits
    ? null
    : (await getDictionary("en")).credits;
  const creditsDict = dict.credits ?? fallbackCredits;
  let subscriptionPlan;
  const isCreem = billingProvider === "creem";

  if (user && !isCreem) {
    subscriptionPlan = await trpc.stripe.userPlans.query();
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
