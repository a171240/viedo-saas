import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@videofly/ui/card";

import { CreemSubscriptionCard } from "~/components/price/creem-subscription-card";
import { DashboardShell } from "~/components/shell";
import { billingProvider } from "~/config/billing-provider";
import type { Locale } from "~/config/i18n-config";
import { getDictionary } from "~/lib/get-dictionary";
import { trpc } from "~/trpc/server";
import { SubscriptionForm } from "./subscription-form";

export const metadata = {
  title: "Billing",
  description: "Manage billing and your subscription plan.",
};

interface Subscription {
  plan: string | null;
  endsAt: Date | null;
}

export default async function BillingPage({
  params,
}: {
  params: Promise<{
    lang: Locale;
  }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return (
    <DashboardShell
      title={dict.business.billing.billing}
      description={dict.business.billing.content}
      className="space-y-4"
    >
      <SubscriptionCard dict={dict.business.billing} />

      <UsageCard />
    </DashboardShell>
  );
}

function generateSubscriptionMessage(
  dict: Record<string, string>,
  subscription: Subscription,
): string {
  const content = String(dict.subscriptionInfo);
  if (subscription.plan && subscription.endsAt) {
    return content
      .replace("{plan}", subscription.plan)
      .replace("{date}", subscription.endsAt.toLocaleDateString());
  }
  return "";
}

async function SubscriptionCard({ dict }: { dict: Record<string, string> }) {
  if (billingProvider === "creem") {
    return <CreemSubscriptionCard dict={dict} />;
  }

  const subscription = (await trpc.auth.mySubscription.query()) as Subscription;
  const content = generateSubscriptionMessage(dict, subscription);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        {subscription ? (
          <p dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p>{dict.noSubscription}</p>
        )}
      </CardContent>
      <CardFooter>
        <SubscriptionForm hasSubscription={!!subscription} dict={dict} />
      </CardFooter>
    </Card>
  );
}

function UsageCard() {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent>None</CardContent>
    </Card>
  );
}
