import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";
import { siteConfig } from "@/config/site";

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const supportEmail = siteConfig.supportEmail;

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.support.title"),
          body: t("sections.support.body", { email: supportEmail }),
          action: {
            label: t("sections.support.action"),
            href: `mailto:${supportEmail}`,
          },
        },
        {
          title: t("sections.sales.title"),
          body: t("sections.sales.body"),
        },
        {
          title: t("sections.security.title"),
          body: t("sections.security.body", { email: supportEmail }),
        },
      ]}
      footerNote={t("footerNote")}
    />
  );
}
