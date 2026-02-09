import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import {
  CreditPackageStatus,
  CreditTransType,
  SubscriptionPlan,
  creemSubscriptions,
  creditPackages,
  customers,
  db,
  users,
} from "@/db";
import { USAGE_LIMITS } from "@/config/usage-limits";

export type UserUsageLimits = {
  plan: SubscriptionPlan;
  isPaid: boolean;
  maxParallelTasks: number;
  createdAt: Date | null;
};

const planRank: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  BUSINESS: 2,
};

const pickHigherPlan = (a: SubscriptionPlan, b: SubscriptionPlan) =>
  planRank[a] >= planRank[b] ? a : b;

const normalizeEnv = (value?: string | null) => value?.trim() || "";

const creemPlanFromProductId = (productId: string): SubscriptionPlan => {
  const proIds = new Set(
    [
      normalizeEnv(process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO_MONTHLY),
      normalizeEnv(process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO_YEARLY),
    ].filter(Boolean)
  );
  const teamIds = new Set(
    [
      normalizeEnv(process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM_MONTHLY),
      normalizeEnv(process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM_YEARLY),
    ].filter(Boolean)
  );
  const basicIds = new Set(
    [
      normalizeEnv(process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC_MONTHLY),
      normalizeEnv(process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC_YEARLY),
    ].filter(Boolean)
  );

  if (proIds.has(productId)) return SubscriptionPlan.PRO;
  if (teamIds.has(productId)) return SubscriptionPlan.BUSINESS;
  if (basicIds.has(productId)) return SubscriptionPlan.FREE;

  const lower = productId.toLowerCase();
  if (lower.includes("pro")) return SubscriptionPlan.PRO;
  if (lower.includes("team") || lower.includes("business")) {
    return SubscriptionPlan.BUSINESS;
  }

  return SubscriptionPlan.FREE;
};

const isCreemSubscriptionActive = (status: string | null, end: Date | null) => {
  const normalizedStatus = status ? status.toLowerCase() : "";
  const activeStatuses = new Set<string>(USAGE_LIMITS.creemActiveStatuses);
  const isStatusActive = normalizedStatus ? activeStatuses.has(normalizedStatus) : false;
  const graceMs = USAGE_LIMITS.subscriptionGraceDays * 24 * 60 * 60 * 1000;
  const isWithinPeriod = end ? end.getTime() + graceMs > Date.now() : true;
  return isStatusActive && isWithinPeriod;
};

export async function getUserUsageLimits(
  userId: string
): Promise<UserUsageLimits> {
  const graceMs = USAGE_LIMITS.subscriptionGraceDays * 24 * 60 * 60 * 1000;

  const [userRow, stripeRow, creemRow, paidCreditsRow] = await Promise.all([
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        plan: customers.plan,
        stripeCurrentPeriodEnd: customers.stripeCurrentPeriodEnd,
      })
      .from(customers)
      .where(eq(customers.authUserId, userId))
      .limit(1),
    db
      .select({
        productId: creemSubscriptions.productId,
        status: creemSubscriptions.status,
        currentPeriodEnd: creemSubscriptions.currentPeriodEnd,
        updatedAt: creemSubscriptions.updatedAt,
      })
      .from(creemSubscriptions)
      .where(eq(creemSubscriptions.userId, userId))
      .orderBy(desc(creemSubscriptions.updatedAt))
      .limit(1),
    db
      .select({ id: creditPackages.id })
      .from(creditPackages)
      .where(
        and(
          eq(creditPackages.userId, userId),
          eq(creditPackages.status, CreditPackageStatus.ACTIVE),
          or(
            isNull(creditPackages.expiredAt),
            gt(creditPackages.expiredAt, new Date())
          ),
          or(
            eq(creditPackages.transType, CreditTransType.ORDER_PAY),
            eq(creditPackages.transType, CreditTransType.SUBSCRIPTION)
          )
        )
      )
      .limit(1),
  ]);

  let plan: SubscriptionPlan = SubscriptionPlan.FREE;

  const stripePlan = stripeRow[0]?.plan ?? null;
  const stripeEnd = stripeRow[0]?.stripeCurrentPeriodEnd ?? null;
  if (
    stripePlan &&
    stripeEnd &&
    stripeEnd.getTime() + graceMs > Date.now()
  ) {
    plan = stripePlan as SubscriptionPlan;
  }

  const creemSubscription = creemRow[0];
  if (
    creemSubscription &&
    isCreemSubscriptionActive(
      creemSubscription.status,
      creemSubscription.currentPeriodEnd
    )
  ) {
    const creemPlan = creemPlanFromProductId(creemSubscription.productId);
    plan = pickHigherPlan(plan, creemPlan);
  }

  const isPaid = plan !== SubscriptionPlan.FREE || paidCreditsRow.length > 0;

  const maxParallelTasks =
    USAGE_LIMITS.parallelTasksByPlan[plan] ??
    USAGE_LIMITS.parallelTasksByPlan.FREE;

  return {
    plan,
    isPaid,
    maxParallelTasks,
    createdAt: userRow[0]?.createdAt ?? null,
  };
}
