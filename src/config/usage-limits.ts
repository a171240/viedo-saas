export const USAGE_LIMITS = {
  accountCooldownMinutes: 5,
  subscriptionGraceDays: 1,
  creemActiveStatuses: ["active", "trialing", "past_due"],
  parallelTasksByPlan: {
    FREE: 1,
    PRO: 2,
    BUSINESS: 3,
  },
  free: {
    dailyMax: 10,
    rateLimit: {
      windowMs: 60_000,
      max: 4,
    },
    ipRateLimit: {
      windowMs: 60_000,
      max: 12,
    },
  },
  paid: {
    dailyMax: 200,
    rateLimit: {
      windowMs: 60_000,
      max: 20,
    },
    ipRateLimit: {
      windowMs: 60_000,
      max: 60,
    },
  },
} as const;
