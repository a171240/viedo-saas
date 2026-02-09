import { and, count, eq, gte, sql } from "drizzle-orm";
import { db, VideoStatus, videos } from "@/db";
import { ADMIN_ANALYTICS_CONFIG } from "@/config/admin-analytics";

const toNumber = (value: unknown) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeMessage = (message?: string | null) =>
  (message || "unknown").trim();

const resolveFailureCode = (message?: string | null) => {
  const text = normalizeMessage(message);
  for (const rule of ADMIN_ANALYTICS_CONFIG.failureCodeRules) {
    if (rule.match.test(text)) {
      return rule.code;
    }
  }
  return "unknown";
};

type AnalyticsRow = {
  provider: string | null;
  model: string | null;
  total: number;
  completed: number;
  failed: number;
  avgLatencySeconds: number;
  avgCredits: number;
  totalCredits: number;
  successRate?: number;
  estimatedCostUsd?: number | null;
};

export type VideoAnalyticsSummary = {
  lookbackDays: number;
  since: string;
  totals: {
    total: number;
    completed: number;
    failed: number;
    successRate: number;
    avgLatencySeconds: number;
    avgCredits: number;
    totalCredits: number;
    estimatedCostUsd: number | null;
  };
  byProvider: AnalyticsRow[];
  byModel: AnalyticsRow[];
  failures: {
    categories: Array<{ code: string; count: number }>;
    messages: Array<{ message: string; count: number }>;
  };
  costPerCreditUsd: number | null;
};

const buildSummaryRow = (row: AnalyticsRow, costPerCreditUsd: number | null) => {
  const estimatedCostUsd =
    costPerCreditUsd && row.totalCredits > 0
      ? row.totalCredits * costPerCreditUsd
      : null;
  return {
    ...row,
    estimatedCostUsd,
    successRate: row.total ? row.completed / row.total : 0,
  };
};

export async function getVideoAnalyticsSummary(options?: {
  days?: number;
}): Promise<VideoAnalyticsSummary> {
  const lookbackDays = options?.days ?? ADMIN_ANALYTICS_CONFIG.lookbackDays;
  const sinceDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
  const since = sinceDate.toISOString();

  const baseWhere = and(
    gte(videos.createdAt, sinceDate),
    eq(videos.isDeleted, false)
  );

  const totalsResult = await db
    .select({
      total: count(),
      completed: sql<number>`sum(case when ${videos.status} = ${VideoStatus.COMPLETED} then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${videos.status} = ${VideoStatus.FAILED} then 1 else 0 end)`,
      avgLatencySeconds: sql<number>`avg(case when ${videos.status} = ${VideoStatus.COMPLETED} and ${videos.completedAt} is not null then extract(epoch from (${videos.completedAt} - ${videos.createdAt})) end)`,
      avgCredits: sql<number>`avg(${videos.creditsUsed})`,
      totalCredits: sql<number>`coalesce(sum(${videos.creditsUsed}), 0)`,
    })
    .from(videos)
    .where(baseWhere);

  const totalsRow = totalsResult[0];
  const total = toNumber(totalsRow?.total);
  const completed = toNumber(totalsRow?.completed);
  const failed = toNumber(totalsRow?.failed);
  const avgLatencySeconds = toNumber(totalsRow?.avgLatencySeconds);
  const avgCredits = toNumber(totalsRow?.avgCredits);
  const totalCredits = toNumber(totalsRow?.totalCredits);
  const costPerCreditUsd = ADMIN_ANALYTICS_CONFIG.costPerCreditUsd;
  const estimatedCostUsd =
    costPerCreditUsd && totalCredits > 0 ? totalCredits * costPerCreditUsd : null;

  const totals = {
    total,
    completed,
    failed,
    successRate: total ? completed / total : 0,
    avgLatencySeconds,
    avgCredits,
    totalCredits,
    estimatedCostUsd,
  };

  const byProviderRaw = await db
    .select({
      provider: videos.provider,
      model: sql<string | null>`null`,
      total: count(),
      completed: sql<number>`sum(case when ${videos.status} = ${VideoStatus.COMPLETED} then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${videos.status} = ${VideoStatus.FAILED} then 1 else 0 end)`,
      avgLatencySeconds: sql<number>`avg(case when ${videos.status} = ${VideoStatus.COMPLETED} and ${videos.completedAt} is not null then extract(epoch from (${videos.completedAt} - ${videos.createdAt})) end)`,
      avgCredits: sql<number>`avg(${videos.creditsUsed})`,
      totalCredits: sql<number>`coalesce(sum(${videos.creditsUsed}), 0)`,
    })
    .from(videos)
    .where(baseWhere)
    .groupBy(videos.provider);

  const byModelRaw = await db
    .select({
      provider: videos.provider,
      model: videos.model,
      total: count(),
      completed: sql<number>`sum(case when ${videos.status} = ${VideoStatus.COMPLETED} then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${videos.status} = ${VideoStatus.FAILED} then 1 else 0 end)`,
      avgLatencySeconds: sql<number>`avg(case when ${videos.status} = ${VideoStatus.COMPLETED} and ${videos.completedAt} is not null then extract(epoch from (${videos.completedAt} - ${videos.createdAt})) end)`,
      avgCredits: sql<number>`avg(${videos.creditsUsed})`,
      totalCredits: sql<number>`coalesce(sum(${videos.creditsUsed}), 0)`,
    })
    .from(videos)
    .where(baseWhere)
    .groupBy(videos.provider, videos.model);

  type RawAnalyticsRow = {
    provider: string | null;
    model: string | null;
    total: unknown;
    completed: unknown;
    failed: unknown;
    avgLatencySeconds: unknown;
    avgCredits: unknown;
    totalCredits: unknown;
  };

  const hydrateRows = (rows: RawAnalyticsRow[]): AnalyticsRow[] =>
    rows.map((row) => ({
      provider: row.provider,
      model: row.model,
      total: toNumber(row.total),
      completed: toNumber(row.completed),
      failed: toNumber(row.failed),
      avgLatencySeconds: toNumber(row.avgLatencySeconds),
      avgCredits: toNumber(row.avgCredits),
      totalCredits: toNumber(row.totalCredits),
    }));

  const byProvider = hydrateRows(byProviderRaw)
    .map((row) => buildSummaryRow(row, costPerCreditUsd))
    .sort((a, b) => b.total - a.total);

  const byModel = hydrateRows(byModelRaw)
    .map((row) => buildSummaryRow(row, costPerCreditUsd))
    .sort((a, b) => b.total - a.total);

  const failureRows = await db
    .select({
      errorMessage: videos.errorMessage,
    })
    .from(videos)
    .where(
      and(
        baseWhere,
        eq(videos.status, VideoStatus.FAILED)
      )
    );

  const failureCounts = new Map<string, number>();
  const messageCounts = new Map<string, number>();
  for (const row of failureRows) {
    const message = normalizeMessage(row.errorMessage);
    const code = resolveFailureCode(message);
    failureCounts.set(code, (failureCounts.get(code) || 0) + 1);
    messageCounts.set(message, (messageCounts.get(message) || 0) + 1);
  }

  const categories = Array.from(failureCounts.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, ADMIN_ANALYTICS_CONFIG.topFailures);

  const messages = Array.from(messageCounts.entries())
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, ADMIN_ANALYTICS_CONFIG.topFailures);

  return {
    lookbackDays,
    since,
    totals,
    byProvider,
    byModel,
    failures: {
      categories,
      messages,
    },
    costPerCreditUsd,
  };
}
