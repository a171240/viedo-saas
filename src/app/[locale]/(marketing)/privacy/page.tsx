import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";
import { siteConfig } from "@/config/site";

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.summary.title"),
          body: t("sections.summary.body"),
        },
        {
          title: t("sections.data.title"),
          items: [
            t("sections.data.items.account"),
            t("sections.data.items.usage"),
            t("sections.data.items.billing"),
          ],
        },
        {
          title: t("sections.use.title"),
          items: [
            t("sections.use.items.deliver"),
            t("sections.use.items.improve"),
            t("sections.use.items.support"),
          ],
        },
        {
          title: t("sections.choices.title"),
          body: t("sections.choices.body"),
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
