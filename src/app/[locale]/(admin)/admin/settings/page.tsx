import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, FileText, ExternalLink } from "@/components/ui/icons";
import { getTranslations } from "next-intl/server";

interface AdminSettingsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AdminSettingsPage({ params }: AdminSettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("settings.pricing.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.pricing.description")}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("settings.pricing.configLabel")}</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  src/config/pricing-user.ts
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("settings.pricing.reloadLabel")}</span>
                <span className="text-green-600">{t("settings.supported")}</span>
              </div>
            </div>
            <Button asChild className="w-full">
              <a href="https://docs.videofly.app" target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                {t("settings.pricing.action")}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("settings.adminEmail.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.adminEmail.description")}
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("settings.adminEmail.envLabel")}</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  ADMIN_EMAIL
                </code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("settings.adminEmail.autoSetLabel")}</span>
                <span className="text-green-600">{t("settings.supported")}</span>
              </div>
            </div>
            <Button asChild variant="outline" className="w-full">
              <a href="https://docs.videofly.app" target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" />
                {t("settings.adminEmail.action")}
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("settings.scripts.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{t("settings.scripts.addCredits")}</h3>
                <code className="block text-xs bg-muted p-2 rounded">
                  pnpm script:add-credits &lt;email&gt; &lt;credits&gt;
                </code>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{t("settings.scripts.checkCredits")}</h3>
                <code className="block text-xs bg-muted p-2 rounded">
                  pnpm script:check-credits &lt;email&gt;
                </code>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{t("settings.scripts.resetCredits")}</h3>
                <code className="block text-xs bg-muted p-2 rounded">
                  pnpm script:reset-credits &lt;email&gt;
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
