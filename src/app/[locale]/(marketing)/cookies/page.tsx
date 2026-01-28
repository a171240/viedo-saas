import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";
import { siteConfig } from "@/config/site";

export default async function CookiesPage() {
  const t = await getTranslations("Cookies");

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.necessary.title"),
          body: t("sections.necessary.body"),
        },
        {
          title: t("sections.analytics.title"),
          body: t("sections.analytics.body"),
        },
        {
          title: t("sections.manage.title"),
          items: [
            t("sections.manage.items.browser"),
            t("sections.manage.items.banner"),
          ],
        },
        {
          title: t("sections.contact.title"),
          body: t("sections.contact.body", { email: siteConfig.supportEmail }),
        },
      ]}
      footerNote={t("footerNote")}
    />
  );
}
