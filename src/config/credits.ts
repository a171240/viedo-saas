// ============================================
// 类型定义
// ============================================

export type ProductType = "subscription" | "one-time";
export type ProviderType = "evolink" | "kie";

export interface CreditPackagePrice {
  priceId: string;           // Creem/Stripe 价格 ID
  amount: number;            // 价格（美分）
  currency: string;
}

export interface CreditPackageConfig {
  id: string;
  credits: number;           // 积分数量
  price: CreditPackagePrice;
  type: ProductType;
  billingPeriod?: "month" | "year";
  popular?: boolean;
  disabled?: boolean;
  expireDays?: number;       // 覆盖默认过期天数
  features?: string[];       // 功能列表（用于展示）
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderType;
  description: string;
  supportImageToVideo: boolean;
  maxDuration: number;
  durations: number[];
  aspectRatios: string[];
  qualities?: string[];
  creditCost: {
    base: number;            // 基础积分（10s）
    perExtraSecond?: number; // 每额外秒积分
    highQualityMultiplier?: number; // 高质量乘数
  };
}

// ============================================
// 统一积分配置
// ============================================

export const CREDITS_CONFIG = {
  // ========== 系统开关 ==========
  enabled: true,

  // 是否允许免费用户购买积分包
  // false: 仅付费订阅用户可购买
  // true: 所有用户可购买
  enablePackagesForFreePlan: false,

  // ========== 新用户赠送 ==========
  registerGift: {
    enabled: process.env.CREDIT_NEW_USER_ENABLED !== "false",
    amount: Number.parseInt(process.env.CREDIT_NEW_USER_AMOUNT || "50"),
    expireDays: Number.parseInt(process.env.CREDIT_NEW_USER_EXPIRY_DAYS || "30"),
  },

  // ========== 过期配置 ==========
  expiration: {
    // 订阅积分有效期（天）
    subscriptionDays: Number.parseInt(
      process.env.CREDIT_SUBSCRIPTION_EXPIRY_DAYS || "30"
    ),
    // 一次性购买积分有效期（天）
    purchaseDays: Number.parseInt(
      process.env.CREDIT_PURCHASE_EXPIRY_DAYS || "365"
    ),
    // 即将过期提醒阈值（天）
    warnBeforeDays: 7,
  },

  // ========== 订阅产品 ==========
  subscriptions: {
    basic_monthly: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC_MONTHLY ||
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC ||
        "prod_sub_basic_monthly",
      credits: 100,
      price: {
        priceId:
          process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_BASIC_MONTHLY ||
          process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_BASIC ||
          "",
        amount: 990, // $9.9
        currency: "USD",
      },
      type: "subscription" as const,
      billingPeriod: "month",
      popular: false,
      features: [
        "credits.features.100_per_month",
        "credits.features.10s_video",
        "credits.features.standard_quality",
      ],
    },
    pro_monthly: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO_MONTHLY ||
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO ||
        "prod_sub_pro_monthly",
      credits: 500,
      price: {
        priceId:
          process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_PRO_MONTHLY ||
          process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_PRO ||
          "",
        amount: 2990, // $29.9
        currency: "USD",
      },
      type: "subscription" as const,
      billingPeriod: "month",
      popular: true,
      features: [
        "credits.features.500_per_month",
        "credits.features.15s_video",
        "credits.features.high_quality",
        "credits.features.priority_queue",
      ],
    },
    team_monthly: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM_MONTHLY ||
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM ||
        "prod_sub_team_monthly",
      credits: 2000,
      price: {
        priceId:
          process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_TEAM_MONTHLY ||
          process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_TEAM ||
          "",
        amount: 9990, // $99.9
        currency: "USD",
      },
      type: "subscription" as const,
      billingPeriod: "month",
      popular: false,
      features: [
        "credits.features.2000_per_month",
        "credits.features.all_features",
        "credits.features.api_access",
        "credits.features.priority_support",
      ],
    },
    basic_yearly: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC_YEARLY ||
        "prod_sub_basic_yearly",
      credits: 1200,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_BASIC_YEARLY || "",
        amount: 9900, // $99
        currency: "USD",
      },
      type: "subscription" as const,
      billingPeriod: "year",
      expireDays: 365,
      popular: false,
      features: [
        "credits.features.1200_per_year",
        "credits.features.10s_video",
        "credits.features.standard_quality",
      ],
    },
    pro_yearly: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO_YEARLY ||
        "prod_sub_pro_yearly",
      credits: 6000,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_PRO_YEARLY || "",
        amount: 29900, // $299
        currency: "USD",
      },
      type: "subscription" as const,
      billingPeriod: "year",
      expireDays: 365,
      popular: true,
      features: [
        "credits.features.6000_per_year",
        "credits.features.15s_video",
        "credits.features.high_quality",
        "credits.features.priority_queue",
      ],
    },
    team_yearly: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM_YEARLY ||
        "prod_sub_team_yearly",
      credits: 24000,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_TEAM_YEARLY || "",
        amount: 99900, // $999
        currency: "USD",
      },
      type: "subscription" as const,
      billingPeriod: "year",
      expireDays: 365,
      popular: false,
      features: [
        "credits.features.24000_per_year",
        "credits.features.all_features",
        "credits.features.api_access",
        "credits.features.priority_support",
      ],
    },
  } satisfies Record<string, CreditPackageConfig>,

  // ========== 一次性购买产品 ==========
  packages: {
    standard: {
      id:
        process.env.NEXT_PUBLIC_CREEM_PRODUCT_PACK_STANDARD ||
        "prod_pack_standard",
      credits: 300,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_PACK_STANDARD || "",
        amount: 1990, // $19.9
        currency: "USD",
      },
      type: "one-time" as const,
      popular: true,
      expireDays: 365,
      features: [
        "credits.features.300_credits",
        "credits.features.365_days_valid",
        "credits.features.all_models",
        "credits.features.best_value",
      ],
    },
  } satisfies Record<string, CreditPackageConfig>,

  // ========== AI 模型配置 ==========
  models: {
    "sora-2": {
      id: "sora-2",
      name: "Sora 2",
      provider: "evolink" as const,
      description: "models.sora2.description",
      supportImageToVideo: true,
      maxDuration: 15,
      durations: [10, 15],
      aspectRatios: ["16:9", "9:16"],
      creditCost: {
        base: 15,              // 10s = 15 积分
        perExtraSecond: 1.4,   // 15s = 15 + 5*1.4 = 22 积分
      },
    },
    "sora-2-pro": {
      id: "sora-2-pro",
      name: "Sora 2 Pro",
      provider: "kie" as const,
      description: "models.sora2pro.description",
      supportImageToVideo: false,
      maxDuration: 15,
      durations: [10, 15],
      aspectRatios: ["16:9", "9:16"],
      qualities: ["standard", "high"],
      creditCost: {
        base: 18,              // standard 10s = 18 积分
        perExtraSecond: 1.6,   // standard 15s = 18 + 5*1.6 = 26 积分
        highQualityMultiplier: 1.4, // high = base * 1.4
      },
    },
  } satisfies Record<string, ModelConfig>,
};

// ============================================
// 辅助函数
// ============================================

/** 获取所有订阅产品 */
export function getSubscriptionProducts(): CreditPackageConfig[] {
  return Object.values(CREDITS_CONFIG.subscriptions).filter(
    (p) => !(p as CreditPackageConfig).disabled
  );
}

/** 获取所有一次性购买产品 */
export function getOnetimeProducts(): CreditPackageConfig[] {
  return Object.values(CREDITS_CONFIG.packages).filter(
    (p) => !(p as CreditPackageConfig).disabled
  );
}

/** 根据产品 ID 获取配置 */
export function getProductById(productId: string): CreditPackageConfig | null {
  const all = {
    ...CREDITS_CONFIG.subscriptions,
    ...CREDITS_CONFIG.packages,
  };
  return Object.values(all).find(p => p.id === productId) || null;
}

/** 获取产品过期天数 */
export function getProductExpiryDays(product: CreditPackageConfig): number {
  if (product.expireDays !== undefined) {
    return product.expireDays;
  }
  return product.type === "subscription"
    ? CREDITS_CONFIG.expiration.subscriptionDays
    : CREDITS_CONFIG.expiration.purchaseDays;
}

/** 获取所有可用模型 */
export function getAvailableModels(): ModelConfig[] {
  return Object.values(CREDITS_CONFIG.models);
}

/** 根据模型 ID 获取配置 */
export function getModelConfig(modelId: string): ModelConfig | null {
  return CREDITS_CONFIG.models[modelId as keyof typeof CREDITS_CONFIG.models] || null;
}

/** 计算模型积分消耗 */
export function calculateModelCredits(
  modelId: string,
  params: { duration: number; quality?: string }
): number {
  const config = getModelConfig(modelId);
  if (!config) return 0;

  const { base, perExtraSecond = 0, highQualityMultiplier = 1 } = config.creditCost;
  const extraSeconds = Math.max(0, params.duration - 10);
  let credits = base + extraSeconds * perExtraSecond;

  if (params.quality === "high" && highQualityMultiplier > 1) {
    credits = Math.round(credits * highQualityMultiplier);
  }

  return Math.round(credits);
}
