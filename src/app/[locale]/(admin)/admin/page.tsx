import { db } from "@/db";
import { users, videos, creditPackages, VideoStatus } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users as UsersIcon,
  Video,
  Coins,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from "@/components/ui/icons";
import { getTranslations } from "next-intl/server";

interface AdminDashboardPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AdminDashboardPage({ params }: AdminDashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });

  const [
    totalUsersResult,
    totalVideosResult,
    totalCreditPackagesResult,
    completedVideosResult,
    failedVideosResult,
    pendingVideosResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(videos),
    db.select({ count: count() }).from(creditPackages),
    db.select({ count: count() }).from(videos).where(eq(videos.status, VideoStatus.COMPLETED)),
    db.select({ count: count() }).from(videos).where(eq(videos.status, VideoStatus.FAILED)),
    db.select({ count: count() }).from(videos).where(eq(videos.status, VideoStatus.PENDING)),
  ]);

  const totalUsers = totalUsersResult[0]?.count || 0;
  const totalVideos = totalVideosResult[0]?.count || 0;
  const completedVideos = completedVideosResult[0]?.count || 0;
  const failedVideos = failedVideosResult[0]?.count || 0;
  const pendingVideos = pendingVideosResult[0]?.count || 0;

  const totalFinishedVideos = completedVideos + failedVideos;
  const successRate = totalFinishedVideos > 0
    ? (completedVideos / totalFinishedVideos) * 100
    : 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();
  const recentUsersResult = await db
    .select({ count: count() })
    .from(users)
    .where(sql`${users.createdAt} >= ${sevenDaysAgoStr}::timestamp`);
  const recentUsers = recentUsersResult[0]?.count || 0;

  const recentVideosResult = await db
    .select({ count: count() })
    .from(videos)
    .where(sql`${videos.createdAt} >= ${sevenDaysAgoStr}::timestamp`);
  const recentVideos = recentVideosResult[0]?.count || 0;

  const percentOfTotal = (value: number, total: number) =>
    total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.stats.totalUsers")}
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.stats.recentUsers", { count: recentUsers })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.stats.totalVideos")}
            </CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVideos}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.stats.recentVideos", { count: recentVideos })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.stats.successRate")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.stats.completedRatio", {
                completed: completedVideos,
                total: totalFinishedVideos,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.stats.creditPackages")}
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreditPackagesResult[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.stats.allUsers")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.status.completed")}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedVideos}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.status.percentOfTotal", {
                percent: percentOfTotal(completedVideos, totalVideos),
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.status.failed")}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedVideos}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.status.percentOfTotal", {
                percent: percentOfTotal(failedVideos, totalVideos),
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.status.pending")}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingVideos}</div>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.status.percentOfTotal", {
                percent: percentOfTotal(pendingVideos, totalVideos),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.quickActions.title")}</CardTitle>
          <CardDescription>{t("dashboard.quickActions.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <a
            href={`/${locale}/admin/users`}
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <UsersIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{t("dashboard.quickActions.users.title")}</div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.quickActions.users.description")}
              </div>
            </div>
          </a>

          <a
            href={`/${locale}/admin/analytics`}
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{t("dashboard.quickActions.analytics.title")}</div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.quickActions.analytics.description")}
              </div>
            </div>
          </a>

          <a
            href={`/${locale}/admin/settings`}
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
          >
            <Coins className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">{t("dashboard.quickActions.settings.title")}</div>
              <div className="text-sm text-muted-foreground">
                {t("dashboard.quickActions.settings.description")}
              </div>
            </div>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
