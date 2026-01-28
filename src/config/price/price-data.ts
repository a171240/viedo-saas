import { env } from "@/env.mjs";

export interface SubscriptionPlanTranslation {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  limitations: string[];
  credits: number;
  parallelTasks: number;
  commercialUse: boolean;
  noWatermark: boolean;
  prices: {
    monthly: number;
    yearly: number;
  };
  stripeIds: {
    monthly: string | null;
    yearly: string | null;
  };
}

export const priceDataMap: Record<string, SubscriptionPlanTranslation[]> = {
  zh: [
    {
      id: "starter",
      title: "入门版",
      description: "适合初学者",
      benefits: [
        "每月最多 1 个集群",
        "基础分析和报告",
        "访问基础功能",
      ],
      limitations: [
        "无法优先获得新功能",
        "客户支持有限",
        "无法自定义品牌",
        "对商业资源的访问受限",
      ],
      credits: 50,
      parallelTasks: 1,
      commercialUse: false,
      noWatermark: false,
      prices: {
        monthly: 0,
        yearly: 0,
      },
      stripeIds: {
        monthly: null,
        yearly: null,
      },
    },
    {
      id: "pro",
      title: "专业版",
      description: "解锁高级功能",
      benefits: [
        "每月最多 3 个集群",
        "高级分析和报告",
        "访问商业模板",
        "优先客户支持",
        "独家网络研讨会和培训",
      ],
      limitations: [
        "无法自定义品牌",
        "对商业资源的访问受限",
      ],
      credits: 500,
      parallelTasks: 2,
      commercialUse: true,
      noWatermark: true,
      prices: {
        monthly: 30,
        yearly: 288,
      },
      stripeIds: {
        monthly: env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
        yearly: env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? null,
      },
    },
    {
      id: "business",
      title: "企业版",
      description: "适合高阶用户",
      benefits: [
        "每月最多 10 个集群",
        "实时分析和报告",
        "访问所有模板（含自定义品牌）",
        "全天候商业客户支持",
        "个性化配置和账号管理",
      ],
      limitations: [],
      credits: 2000,
      parallelTasks: 3,
      commercialUse: true,
      noWatermark: true,
      prices: {
        monthly: 60,
        yearly: 600,
      },
      stripeIds: {
        monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? null,
        yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID ?? null,
      },
    },
  ],
  en: [
    {
      id: "starter",
      title: "Starter",
      description: "For Beginners",
      benefits: [
        "Up to 1 cluster per month",
        "Basic analytics and reporting",
        "Access to basic features",
      ],
      limitations: [
        "No priority access to new features",
        "Limited customer support",
        "No custom branding",
        "Limited access to business resources",
      ],
      credits: 50,
      parallelTasks: 1,
      commercialUse: false,
      noWatermark: false,
      prices: {
        monthly: 0,
        yearly: 0,
      },
      stripeIds: {
        monthly: null,
        yearly: null,
      },
    },
    {
      id: "pro",
      title: "Pro",
      description: "Unlock Advanced Features",
      benefits: [
        "Up to 3 clusters per month",
        "Advanced analytics and reporting",
        "Access to business templates",
        "Priority customer support",
        "Exclusive webinars and training",
      ],
      limitations: [
        "No custom branding",
        "Limited access to business resources",
      ],
      credits: 500,
      parallelTasks: 2,
      commercialUse: true,
      noWatermark: true,
      prices: {
        monthly: 30,
        yearly: 288,
      },
      stripeIds: {
        monthly: env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? null,
        yearly: env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID ?? null,
      },
    },
    {
      id: "business",
      title: "Business",
      description: "For Power Users",
      benefits: [
        "Up to 10 clusters per month",
        "Real-time analytics and reporting",
        "Access to all templates, including custom branding",
        "24/7 business customer support",
        "Personalized configuration and account management",
      ],
      limitations: [],
      credits: 2000,
      parallelTasks: 3,
      commercialUse: true,
      noWatermark: true,
      prices: {
        monthly: 60,
        yearly: 600,
      },
      stripeIds: {
        monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID ?? null,
        yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID ?? null,
      },
    },
  ],
};
