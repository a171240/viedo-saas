import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  Clock,
  Coins,
  TrendingUp,
  Warning,
} from "@/components/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { getVideoAnalyticsSummary } from "@/services/admin-analytics";

interface AdminAnalyticsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default async function AdminAnalyticsPage({ params }: AdminAnalyticsPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin" });
  const summary = await getVideoAnalyticsSummary();

  const dateLocale = locale === "zh" ? "zh-CN" : "en-US";
  const numberFormat = new Intl.NumberFormat(dateLocale);
  const currencyFormat = new Intl.NumberFormat(dateLocale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

  const formatPercent = (value: number) =>
    `${(value * 100).toFixed(1)}%`;

  const formatDuration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return t("analytics.na");
    if (seconds >= 3600) {
      return t("analytics.units.hours", {
        value: (seconds / 3600).toFixed(1),
      });
    }
    if (seconds >= 60) {
      return t("analytics.units.minutes", {
        value: (seconds / 60).toFixed(1),
      });
    }
    return t("analytics.units.seconds", { value: Math.round(seconds) });
  };

  const formatAvgCredits = (value: number) =>
    Number.isFinite(value) ? value.toFixed(1) : t("analytics.na");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-muted-foreground">
          {t("analytics.subtitle", { days: summary.lookbackDays })}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("analytics.since", {
            date: new Date(summary.since).toLocaleDateString(dateLocale),
          })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title={t("analytics.summary.totalTasks")}
          value={numberFormat.format(summary.totals.total)}
          icon={BarChart3}
        />
        <StatCard
          title={t("analytics.summary.successRate")}
          value={formatPercent(summary.totals.successRate)}
          icon={TrendingUp}
        />
        <StatCard
          title={t("analytics.summary.avgLatency")}
          value={formatDuration(summary.totals.avgLatencySeconds)}
          icon={Clock}
        />
        <StatCard
          title={t("analytics.summary.totalCredits")}
          value={numberFormat.format(summary.totals.totalCredits)}
          icon={Coins}
          description={
            summary.costPerCreditUsd
              ? `${t("analytics.summary.estimatedCost")}: ${currencyFormat.format(
                  summary.totals.estimatedCostUsd || 0
                )}`
              : t("analytics.costNotConfigured")
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.tables.provider.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.columns.provider")}</TableHead>
                  <TableHead>{t("analytics.columns.total")}</TableHead>
                  <TableHead>{t("analytics.columns.completed")}</TableHead>
                  <TableHead>{t("analytics.columns.failed")}</TableHead>
                  <TableHead>{t("analytics.columns.successRate")}</TableHead>
                  <TableHead>{t("analytics.columns.avgLatency")}</TableHead>
                  <TableHead>{t("analytics.columns.avgCredits")}</TableHead>
                  <TableHead>{t("analytics.columns.totalCredits")}</TableHead>
                  <TableHead>{t("analytics.columns.estimatedCost")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byProvider.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      {t("analytics.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.byProvider.map((row) => (
                    <TableRow key={row.provider || "unknown"}>
                      <TableCell className="font-medium">
                        {row.provider || t("analytics.unknown")}
                      </TableCell>
                      <TableCell>{numberFormat.format(row.total)}</TableCell>
                      <TableCell>{numberFormat.format(row.completed)}</TableCell>
                      <TableCell>{numberFormat.format(row.failed)}</TableCell>
                      <TableCell>{formatPercent(row.successRate || 0)}</TableCell>
                      <TableCell>{formatDuration(row.avgLatencySeconds)}</TableCell>
                      <TableCell>{formatAvgCredits(row.avgCredits)}</TableCell>
                      <TableCell>{numberFormat.format(row.totalCredits)}</TableCell>
                      <TableCell>
                        {summary.costPerCreditUsd
                          ? currencyFormat.format(row.estimatedCostUsd || 0)
                          : t("analytics.na")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("analytics.tables.model.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.columns.model")}</TableHead>
                  <TableHead>{t("analytics.columns.provider")}</TableHead>
                  <TableHead>{t("analytics.columns.total")}</TableHead>
                  <TableHead>{t("analytics.columns.completed")}</TableHead>
                  <TableHead>{t("analytics.columns.failed")}</TableHead>
                  <TableHead>{t("analytics.columns.successRate")}</TableHead>
                  <TableHead>{t("analytics.columns.avgLatency")}</TableHead>
                  <TableHead>{t("analytics.columns.avgCredits")}</TableHead>
                  <TableHead>{t("analytics.columns.totalCredits")}</TableHead>
                  <TableHead>{t("analytics.columns.estimatedCost")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.byModel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      {t("analytics.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.byModel.map((row) => (
                    <TableRow key={`${row.model || "unknown"}-${row.provider || "unknown"}`}>
                      <TableCell className="font-medium">
                        {row.model || t("analytics.unknown")}
                      </TableCell>
                      <TableCell>{row.provider || t("analytics.unknown")}</TableCell>
                      <TableCell>{numberFormat.format(row.total)}</TableCell>
                      <TableCell>{numberFormat.format(row.completed)}</TableCell>
                      <TableCell>{numberFormat.format(row.failed)}</TableCell>
                      <TableCell>{formatPercent(row.successRate || 0)}</TableCell>
                      <TableCell>{formatDuration(row.avgLatencySeconds)}</TableCell>
                      <TableCell>{formatAvgCredits(row.avgCredits)}</TableCell>
                      <TableCell>{numberFormat.format(row.totalCredits)}</TableCell>
                      <TableCell>
                        {summary.costPerCreditUsd
                          ? currencyFormat.format(row.estimatedCostUsd || 0)
                          : t("analytics.na")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warning className="h-5 w-5 text-muted-foreground" />
              {t("analytics.tables.failures.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.columns.reason")}</TableHead>
                  <TableHead className="text-right">{t("analytics.columns.count")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.failures.categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      {t("analytics.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.failures.categories.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`analytics.failCodes.${item.code}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {numberFormat.format(item.count)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.tables.rawFailures.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("analytics.columns.message")}</TableHead>
                  <TableHead className="text-right">{t("analytics.columns.count")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.failures.messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      {t("analytics.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.failures.messages.map((item) => (
                    <TableRow key={item.message}>
                      <TableCell className="max-w-[280px] truncate" title={item.message}>
                        {item.message}
                      </TableCell>
                      <TableCell className="text-right">
                        {numberFormat.format(item.count)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
