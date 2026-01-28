import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";
import { siteConfig } from "@/config/site";

export default async function TermsPage() {
  const t = await getTranslations("Terms");

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.usage.title"),
          body: t("sections.usage.body"),
        },
        {
          title: t("sections.billing.title"),
          body: t("sections.billing.body"),
        },
        {
          title: t("sections.content.title"),
          body: t("sections.content.body"),
        },
        {
          title: t("sections.liability.title"),
          body: t("sections.liability.body"),
        },
        {
          title: t("sections.contact.title"),
          body: t("sections.contact.body", { email: siteConfig.supportEmail }),
          action: {
            label: t("sections.contact.action"),
            href: "/contact",
          },
        },
      ]}
      footerNote={t("footerNote")}
    />
  );
}
