import { SettingsPage } from "@/components/billing/settings-page";
import { requireAuth } from "@/lib/auth";

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function SettingsRoute({ params }: PageProps) {
  const { locale } = await params;
  const user = await requireAuth(`/${locale}/login`);

  return (
    <SettingsPage
      locale={locale}
      userEmail={user.email}
      userId={user.id}
    />
  );
}
