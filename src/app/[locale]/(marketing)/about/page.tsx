import { getTranslations } from "next-intl/server";

import { MarketingPage } from "@/components/marketing/marketing-page";
import { siteConfig } from "@/config/site";

export default async function AboutPage() {
  const t = await getTranslations("About");

  return (
    <MarketingPage
      title={t("title")}
      description={t("description")}
      sections={[
        {
          title: t("sections.mission.title"),
          body: t("sections.mission.body"),
        },
        {
          title: t("sections.whatWeBuild.title"),
          body: t("sections.whatWeBuild.body"),
        },
        {
          title: t("sections.values.title"),
          items: [
            t("sections.values.items.clarity"),
            t("sections.values.items.trust"),
            t("sections.values.items.focus"),
            t("sections.values.items.shipping"),
          ],
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
    />
  );
}
