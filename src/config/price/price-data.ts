import { env } from "@/env.mjs";

export interface SubscriptionPlanTranslation {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  limitations: string[];
  credits: number;
  parallelTasks: number;
  priorityQueue: boolean;
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
        "每月固定积分",
        "标准生成队列",
        "核心模型可用",
      ],
      limitations: [
        "输出含水印",
        "不可商用",
        "无优先队列",
      ],
      credits: 50,
      parallelTasks: 1,
      priorityQueue: false,
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
        "每月更多积分",
        "优先队列",
        "可商用",
        "无水印导出",
        "更高并发",
      ],
      limitations: [
        "不含企业级支持",
      ],
      credits: 500,
      parallelTasks: 2,
      priorityQueue: true,
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
        "最高月度积分",
        "优先队列",
        "可商用",
        "无水印导出",
        "最高并发",
        "团队协作",
      ],
      limitations: [],
      credits: 2000,
      parallelTasks: 3,
      priorityQueue: true,
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
        "Monthly credits",
        "Standard queue",
        "Core models access",
      ],
      limitations: [
        "Watermark on outputs",
        "Non-commercial use",
        "No priority queue",
      ],
      credits: 50,
      parallelTasks: 1,
      priorityQueue: false,
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
        "More monthly credits",
        "Priority queue",
        "Commercial use rights",
        "No watermark exports",
        "Higher parallel tasks",
      ],
      limitations: [
        "No dedicated account manager",
      ],
      credits: 500,
      parallelTasks: 2,
      priorityQueue: true,
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
        "Highest monthly credits",
        "Priority queue",
        "Commercial use rights",
        "No watermark exports",
        "Max parallel tasks",
        "Team-ready usage",
      ],
      limitations: [],
      credits: 2000,
      parallelTasks: 3,
      priorityQueue: true,
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
