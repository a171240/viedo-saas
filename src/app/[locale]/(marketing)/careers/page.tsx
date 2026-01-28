import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";

export default async function CareersPage() {
  const t = await getTranslations("Careers");

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.openings.title"),
          body: t("sections.openings.body"),
          action: {
            label: t("sections.openings.action"),
            href: "/contact",
          },
        },
        {
          title: t("sections.values.title"),
          items: [
            t("sections.values.items.ownership"),
            t("sections.values.items.customer"),
            t("sections.values.items.speed"),
          ],
        },
      ]}
    />
  );
}
