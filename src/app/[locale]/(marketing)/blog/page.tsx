import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";

export default async function BlogPage() {
  const t = await getTranslations("Blog");

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.comingSoon.title"),
          body: t("sections.comingSoon.body"),
          action: {
            label: t("sections.comingSoon.action"),
            href: "/contact",
          },
        },
        {
          title: t("sections.topics.title"),
          items: [
            t("sections.topics.items.workflow"),
            t("sections.topics.items.templates"),
            t("sections.topics.items.performance"),
          ],
        },
      ]}
    />
  );
}
