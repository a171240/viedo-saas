# Phase 3: 积分系统

[← 上一阶段](./02-PHASE2-DATA-LAYER.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./04-PHASE4-VIDEO-CORE.md)

---

## 3.1 目标

- 实现完整的积分系统，支持**预扣/冻结 + 结算/退回**机制
- 支持**过期机制**（FIFO 先过期先消耗）
- 支持**新用户赠送**（可配置）
- 支持**任务失败退回**
- **并发安全**：数据库事务 + 唯一约束保证幂等

## 3.2 核心设计

### 3.2.1 积分流转状态图

```text
充值/赠送                    任务创建                  任务完成
   │                           │                        │
   ▼                           ▼                        ▼
┌─────────┐  freeze()   ┌─────────────┐  settle()  ┌─────────┐
│ 可用积分 │ ──────────► │ 冻结中(Hold) │ ─────────► │ 已消耗   │
│ Package │             │             │            │         │
└─────────┘             └─────────────┘            └─────────┘
                              │
                              │ release() (任务失败)
                              ▼
                        ┌─────────┐
                        │ 退回可用 │
                        └─────────┘
```

### 3.2.2 关键原则

1. **任务创建时预扣（freeze）**：立即冻结积分，防止并发超发
2. **任务成功时结算（settle）**：冻结转消耗
3. **任务失败时释放（release）**：冻结退回可用
4. **FIFO 过期消费**：先过期的积分先消费
5. **幂等保证**：通过 `videoUuid` 唯一约束防止重复扣费

## 3.3 数据库 Schema

**修改文件**: `packages/db/prisma/schema.prisma`

```prisma
// ============================================
// Credit System - 积分包模型
// ============================================

// 积分交易类型
enum CreditTransType {
  NEW_USER          // 新用户赠送
  ORDER_PAY         // 订单购买
  SUBSCRIPTION      // 订阅充值
  VIDEO_CONSUME     // 视频生成消耗
  REFUND            // 退款返还
  EXPIRED           // 过期作废
  SYSTEM_ADJUST     // 系统调整
}

// 积分包状态
enum CreditPackageStatus {
  ACTIVE            // 可用
  DEPLETED          // 已用完
  EXPIRED           // 已过期
}

// 积分包 - 每次充值/赠送创建一个包
model CreditPackage {
  id              Int                   @id @default(autoincrement())
  userId          String                @map("user_id")

  // 积分信息
  initialCredits  Int                   @map("initial_credits")  // 初始积分
  remainingCredits Int                  @map("remaining_credits") // 剩余可用
  frozenCredits   Int                   @default(0) @map("frozen_credits") // 冻结中

  // 来源
  transType       CreditTransType       @map("trans_type")
  orderNo         String?               @map("order_no")

  // 状态与过期
  status          CreditPackageStatus   @default(ACTIVE)
  expiredAt       DateTime?             @map("expired_at")

  // 时间戳
  createdAt       DateTime              @default(now()) @map("created_at")
  updatedAt       DateTime              @updatedAt @map("updated_at")

  // 关联
  user            BetterAuthUser        @relation(fields: [userId], references: [id])
  holds           CreditHold[]

  @@index([userId, status])
  @@index([userId, expiredAt])
  @@map("credit_packages")
}

// 积分冻结记录 - 任务进行中的积分锁定
model CreditHold {
  id              Int                   @id @default(autoincrement())

  userId          String                @map("user_id")
  videoUuid       String                @unique @map("video_uuid") // 唯一约束，防止重复冻结

  // 冻结信息
  credits         Int                   // 冻结积分数
  status          String                @default("HOLDING") // HOLDING, SETTLED, RELEASED

  // 关联的积分包分配（JSON 记录从哪些包扣除）
  // 格式: [{packageId: number, credits: number}]
  packageAllocation Json               @map("package_allocation")

  // 时间戳
  createdAt       DateTime              @default(now()) @map("created_at")
  settledAt       DateTime?             @map("settled_at")

  // 关联
  user            BetterAuthUser        @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([status])
  @@map("credit_holds")
}

// 积分流水记录 - 用于审计
model CreditTransaction {
  id              Int                   @id @default(autoincrement())
  transNo         String                @unique @map("trans_no")

  userId          String                @map("user_id")
  transType       CreditTransType       @map("trans_type")

  // 变动
  credits         Int                   // 正数增加，负数减少
  balanceAfter    Int                   @map("balance_after") // 变动后余额快照

  // 关联
  packageId       Int?                  @map("package_id")
  videoUuid       String?               @map("video_uuid")
  orderNo         String?               @map("order_no")
  holdId          Int?                  @map("hold_id")

  // 备注
  remark          String?               @db.Text

  // 时间戳
  createdAt       DateTime              @default(now()) @map("created_at")

  // 关联
  user            BetterAuthUser        @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([transType])
  @@index([createdAt])
  @@map("credit_transactions")
}
```

## 3.4 统一配置文件

> **设计变更 (v3.3)**: 将 `credit-config.ts`、`creem-products.ts`、`model-config.ts` 合并为单一配置文件，便于维护。
> 参考 MkSaaS 的 `websiteConfig.credits` 模式。

**新建文件**: `packages/common/src/config/credits.ts`

```typescript
import type { CreditTransType } from "@prisma/client";

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
    amount: parseInt(process.env.CREDIT_NEW_USER_AMOUNT || "50"),
    expireDays: parseInt(process.env.CREDIT_NEW_USER_EXPIRY_DAYS || "30"),
  },

  // ========== 过期配置 ==========
  expiration: {
    // 订阅积分有效期（天）
    subscriptionDays: parseInt(process.env.CREDIT_SUBSCRIPTION_EXPIRY_DAYS || "30"),
    // 一次性购买积分有效期（天）
    purchaseDays: parseInt(process.env.CREDIT_PURCHASE_EXPIRY_DAYS || "365"),
    // 即将过期提醒阈值（天）
    warnBeforeDays: 7,
  },

  // ========== 订阅产品 ==========
  subscriptions: {
    basic: {
      id: process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC || "prod_sub_basic",
      credits: 100,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_BASIC || "",
        amount: 990,  // $9.9
        currency: "USD",
      },
      type: "subscription" as const,
      popular: false,
      features: [
        "credits.features.100_per_month",
        "credits.features.10s_video",
        "credits.features.standard_quality",
      ],
    },
    pro: {
      id: process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO || "prod_sub_pro",
      credits: 500,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_PRO || "",
        amount: 2990,  // $29.9
        currency: "USD",
      },
      type: "subscription" as const,
      popular: true,
      features: [
        "credits.features.500_per_month",
        "credits.features.15s_video",
        "credits.features.high_quality",
        "credits.features.priority_queue",
      ],
    },
    team: {
      id: process.env.NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM || "prod_sub_team",
      credits: 2000,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_SUB_TEAM || "",
        amount: 9990,  // $99.9
        currency: "USD",
      },
      type: "subscription" as const,
      popular: false,
      features: [
        "credits.features.2000_per_month",
        "credits.features.all_features",
        "credits.features.api_access",
        "credits.features.priority_support",
      ],
    },
  } satisfies Record<string, CreditPackageConfig>,

  // ========== 一次性购买产品 ==========
  packages: {
    starter: {
      id: process.env.NEXT_PUBLIC_CREEM_PRODUCT_PACK_STARTER || "prod_pack_starter",
      credits: 50,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_PACK_STARTER || "",
        amount: 490,  // $4.9
        currency: "USD",
      },
      type: "one-time" as const,
      popular: false,
      expireDays: 365,
      features: [
        "credits.features.50_credits",
        "credits.features.365_days_valid",
        "credits.features.all_models",
      ],
    },
    standard: {
      id: process.env.NEXT_PUBLIC_CREEM_PRODUCT_PACK_STANDARD || "prod_pack_standard",
      credits: 300,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_PACK_STANDARD || "",
        amount: 1990,  // $19.9
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
    premium: {
      id: process.env.NEXT_PUBLIC_CREEM_PRODUCT_PACK_PREMIUM || "prod_pack_premium",
      credits: 1000,
      price: {
        priceId: process.env.NEXT_PUBLIC_CREEM_PRICE_PACK_PREMIUM || "",
        amount: 4990,  // $49.9
        currency: "USD",
      },
      type: "one-time" as const,
      popular: false,
      expireDays: 365,
      features: [
        "credits.features.1000_credits",
        "credits.features.365_days_valid",
        "credits.features.all_models",
        "credits.features.priority_support",
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
  return Object.values(CREDITS_CONFIG.subscriptions).filter(p => !p.disabled);
}

/** 获取所有一次性购买产品 */
export function getOnetimeProducts(): CreditPackageConfig[] {
  return Object.values(CREDITS_CONFIG.packages).filter(p => !p.disabled);
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
  return CREDITS_CONFIG.models[modelId] || null;
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

/** 导出类型供其他模块使用 */
export type { CreditPackageConfig, ModelConfig, CreditPackagePrice };
```

> **变更说明**: 此配置文件合并了原来的三个文件：
> - `credit-config.ts` → `CREDITS_CONFIG.registerGift` + `CREDITS_CONFIG.expiration`
> - `creem-products.ts` → `CREDITS_CONFIG.subscriptions` + `CREDITS_CONFIG.packages`
> - `model-config.ts` → `CREDITS_CONFIG.models`

## 3.5 积分 Service 层

**新建文件**: `packages/common/src/services/credit.ts`

```typescript
import { db } from "@videofly/db";
import { CreditTransType, CreditPackageStatus, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { CREDITS_CONFIG, getProductExpiryDays, getProductById } from "../config/credits";

export interface CreditBalance {
  totalCredits: number;      // 总获得积分
  usedCredits: number;       // 已消耗积分
  frozenCredits: number;     // 冻结中积分
  availableCredits: number;  // 可用积分 (total - used - frozen)
  expiringSoon: number;      // 即将过期（7天内）
}

interface PackageAllocation {
  packageId: number;
  credits: number;
}

export class CreditService {
  /**
   * 获取用户积分余额
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const now = new Date();
    const expiringSoonDate = new Date(
      now.getTime() + CREDITS_CONFIG.expiration.warnBeforeDays * 24 * 60 * 60 * 1000
    );

    // 获取所有有效积分包
    const packages = await db.creditPackage.findMany({
      where: {
        userId,
        status: CreditPackageStatus.ACTIVE,
        OR: [
          { expiredAt: null },
          { expiredAt: { gt: now } },
        ],
      },
    });

    let totalCredits = 0;
    let usedCredits = 0;
    let frozenCredits = 0;
    let expiringSoon = 0;

    for (const pkg of packages) {
      totalCredits += pkg.initialCredits;
      usedCredits += pkg.initialCredits - pkg.remainingCredits - pkg.frozenCredits;
      frozenCredits += pkg.frozenCredits;

      // 计算即将过期的可用积分
      if (pkg.expiredAt && pkg.expiredAt <= expiringSoonDate) {
        expiringSoon += pkg.remainingCredits;
      }
    }

    return {
      totalCredits,
      usedCredits,
      frozenCredits,
      availableCredits: packages.reduce((sum, p) => sum + p.remainingCredits, 0),
      expiringSoon,
    };
  }

  /**
   * 冻结积分（任务创建时调用）
   * 使用数据库事务 + 唯一约束保证幂等性
   */
  async freeze(params: {
    userId: string;
    credits: number;
    videoUuid: string;
  }): Promise<{ success: boolean; holdId: number }> {
    const { userId, credits, videoUuid } = params;

    return db.$transaction(async (tx) => {
      // 检查是否已存在冻结记录（幂等）
      const existingHold = await tx.creditHold.findUnique({
        where: { videoUuid },
      });

      if (existingHold) {
        if (existingHold.status === "HOLDING") {
          return { success: true, holdId: existingHold.id };
        }
        throw new Error(`Hold already processed for video: ${videoUuid}`);
      }

      // 获取有效积分包，按过期时间排序（FIFO）
      const now = new Date();
      const packages = await tx.creditPackage.findMany({
        where: {
          userId,
          status: CreditPackageStatus.ACTIVE,
          remainingCredits: { gt: 0 },
          OR: [
            { expiredAt: null },
            { expiredAt: { gt: now } },
          ],
        },
        orderBy: [
          { expiredAt: "asc" }, // 先过期的先用，null 排最后
          { createdAt: "asc" },
        ],
      });

      // 计算可用积分
      const availableCredits = packages.reduce((sum, p) => sum + p.remainingCredits, 0);
      if (availableCredits < credits) {
        throw new Error(
          `Insufficient credits. Required: ${credits}, Available: ${availableCredits}`
        );
      }

      // 分配积分包
      const allocation: PackageAllocation[] = [];
      let remaining = credits;

      for (const pkg of packages) {
        if (remaining <= 0) break;

        const toFreeze = Math.min(pkg.remainingCredits, remaining);
        allocation.push({ packageId: pkg.id, credits: toFreeze });

        // 更新积分包：减少可用，增加冻结
        await tx.creditPackage.update({
          where: { id: pkg.id },
          data: {
            remainingCredits: { decrement: toFreeze },
            frozenCredits: { increment: toFreeze },
          },
        });

        remaining -= toFreeze;
      }

      // 创建冻结记录
      const hold = await tx.creditHold.create({
        data: {
          userId,
          videoUuid,
          credits,
          status: "HOLDING",
          packageAllocation: allocation,
        },
      });

      return { success: true, holdId: hold.id };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // 最高隔离级别防并发
    });
  }

  /**
   * 结算积分（任务成功时调用）
   */
  async settle(videoUuid: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const hold = await tx.creditHold.findUnique({
        where: { videoUuid },
      });

      if (!hold) {
        throw new Error(`Hold not found for video: ${videoUuid}`);
      }

      if (hold.status === "SETTLED") {
        return; // 幂等：已结算
      }

      if (hold.status !== "HOLDING") {
        throw new Error(`Invalid hold status: ${hold.status}`);
      }

      const allocation = hold.packageAllocation as PackageAllocation[];

      // 从各积分包扣除冻结
      for (const { packageId, credits } of allocation) {
        await tx.creditPackage.update({
          where: { id: packageId },
          data: {
            frozenCredits: { decrement: credits },
          },
        });

        // 检查是否用完
        const pkg = await tx.creditPackage.findUnique({ where: { id: packageId } });
        if (pkg && pkg.remainingCredits === 0 && pkg.frozenCredits === 0) {
          await tx.creditPackage.update({
            where: { id: packageId },
            data: { status: CreditPackageStatus.DEPLETED },
          });
        }
      }

      // 更新冻结记录状态
      await tx.creditHold.update({
        where: { videoUuid },
        data: {
          status: "SETTLED",
          settledAt: new Date(),
        },
      });

      // 记录流水
      const balance = await this.getBalanceInTx(tx, hold.userId);
      await tx.creditTransaction.create({
        data: {
          transNo: `TXN${Date.now()}${nanoid(6)}`,
          userId: hold.userId,
          transType: CreditTransType.VIDEO_CONSUME,
          credits: -hold.credits,
          balanceAfter: balance.availableCredits,
          videoUuid,
          holdId: hold.id,
          remark: `Video generation settled: ${videoUuid}`,
        },
      });
    });
  }

  /**
   * 释放积分（任务失败时调用）
   */
  async release(videoUuid: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const hold = await tx.creditHold.findUnique({
        where: { videoUuid },
      });

      if (!hold) {
        throw new Error(`Hold not found for video: ${videoUuid}`);
      }

      if (hold.status === "RELEASED") {
        return; // 幂等：已释放
      }

      if (hold.status !== "HOLDING") {
        throw new Error(`Invalid hold status: ${hold.status}`);
      }

      const allocation = hold.packageAllocation as PackageAllocation[];

      // 退回各积分包
      for (const { packageId, credits } of allocation) {
        await tx.creditPackage.update({
          where: { id: packageId },
          data: {
            remainingCredits: { increment: credits },
            frozenCredits: { decrement: credits },
          },
        });
      }

      // 更新冻结记录状态
      await tx.creditHold.update({
        where: { videoUuid },
        data: {
          status: "RELEASED",
          settledAt: new Date(),
        },
      });

      // 记录流水（退回不改变余额，只记录事件）
      const balance = await this.getBalanceInTx(tx, hold.userId);
      await tx.creditTransaction.create({
        data: {
          transNo: `TXN${Date.now()}${nanoid(6)}`,
          userId: hold.userId,
          transType: CreditTransType.REFUND,
          credits: 0, // 退回不改变总余额
          balanceAfter: balance.availableCredits,
          videoUuid,
          holdId: hold.id,
          remark: `Video generation failed, credits released: ${videoUuid}`,
        },
      });
    });
  }

  /**
   * 充值积分
   */
  async recharge(params: {
    userId: string;
    credits: number;
    orderNo: string;
    transType?: CreditTransType;
    expiryDays?: number;
    remark?: string;
  }): Promise<{ packageId: number }> {
    const transType = params.transType || CreditTransType.ORDER_PAY;
    const expiryDays = params.expiryDays ?? CREDITS_CONFIG.expiration.purchaseDays;
    const expiredAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    return db.$transaction(async (tx) => {
      // 创建积分包
      const pkg = await tx.creditPackage.create({
        data: {
          userId: params.userId,
          initialCredits: params.credits,
          remainingCredits: params.credits,
          frozenCredits: 0,
          transType,
          orderNo: params.orderNo,
          status: CreditPackageStatus.ACTIVE,
          expiredAt,
        },
      });

      // 记录流水
      const balance = await this.getBalanceInTx(tx, params.userId);
      await tx.creditTransaction.create({
        data: {
          transNo: `TXN${Date.now()}${nanoid(6)}`,
          userId: params.userId,
          transType,
          credits: params.credits,
          balanceAfter: balance.availableCredits,
          packageId: pkg.id,
          orderNo: params.orderNo,
          remark: params.remark || `Recharge: ${params.orderNo}`,
        },
      });

      return { packageId: pkg.id };
    });
  }

  /**
   * 新用户赠送积分
   */
  async grantNewUserCredits(userId: string): Promise<void> {
    const { registerGift } = CREDITS_CONFIG;
    if (!registerGift.enabled) return;

    // 检查是否已赠送（幂等）
    const existing = await db.creditPackage.findFirst({
      where: {
        userId,
        transType: CreditTransType.NEW_USER,
      },
    });

    if (existing) return;

    await this.recharge({
      userId,
      credits: registerGift.amount,
      orderNo: `NEW_USER_${userId}`,
      transType: CreditTransType.NEW_USER,
      expiryDays: registerGift.expireDays,
      remark: "New user welcome credits",
    });
  }

  /**
   * 过期积分处理（定时任务调用）
   */
  async expireCredits(): Promise<number> {
    const now = new Date();

    const expiredPackages = await db.creditPackage.updateMany({
      where: {
        status: CreditPackageStatus.ACTIVE,
        expiredAt: { lte: now },
        remainingCredits: { gt: 0 },
        frozenCredits: 0, // 避免冻结中的积分被过期
      },
      data: {
        status: CreditPackageStatus.EXPIRED,
      },
    });

    return expiredPackages.count;
  }

  /**
   * 获取积分历史
   */
  async getHistory(userId: string, options?: {
    limit?: number;
    offset?: number;
    transType?: CreditTransType;
  }) {
    const where = {
      userId,
      ...(options?.transType && { transType: options.transType }),
    };

    const [records, total] = await Promise.all([
      db.creditTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      db.creditTransaction.count({ where }),
    ]);

    return { records, total };
  }

  /**
   * 事务内获取余额（内部方法）
   */
  private async getBalanceInTx(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<CreditBalance> {
    const now = new Date();
    const packages = await tx.creditPackage.findMany({
      where: {
        userId,
        status: CreditPackageStatus.ACTIVE,
        OR: [
          { expiredAt: null },
          { expiredAt: { gt: now } },
        ],
      },
    });

    let totalCredits = 0;
    let usedCredits = 0;
    let frozenCredits = 0;

    for (const pkg of packages) {
      totalCredits += pkg.initialCredits;
      usedCredits += pkg.initialCredits - pkg.remainingCredits - pkg.frozenCredits;
      frozenCredits += pkg.frozenCredits;
    }

    return {
      totalCredits,
      usedCredits,
      frozenCredits,
      availableCredits: packages.reduce((sum, p) => sum + p.remainingCredits, 0),
      expiringSoon: 0,
    };
  }
}

export const creditService = new CreditService();
```

## 3.6 积分 API Routes

**新建文件**: `apps/nextjs/src/app/api/v1/credit/balance/route.ts`

```typescript
import { NextRequest } from "next/server";
import { creditService } from "@videofly/common/services/credit";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, handleApiError } from "@/app/api/_lib/response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const balance = await creditService.getBalance(user.id);
    return apiSuccess(balance);
  } catch (error) {
    return handleApiError(error);
  }
}
```

**新建文件**: `apps/nextjs/src/app/api/v1/credit/history/route.ts`

```typescript
import { NextRequest } from "next/server";
import { creditService } from "@videofly/common/services/credit";
import { requireAuth } from "@/app/api/_lib/auth";
import { apiSuccess, handleApiError } from "@/app/api/_lib/response";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const result = await creditService.getHistory(user.id, {
      limit: parseInt(searchParams.get("limit") || "20"),
      offset: parseInt(searchParams.get("offset") || "0"),
      transType: searchParams.get("type") as any,
    });

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

## 3.7 客户端状态管理 (Zustand)

> **设计说明**: 使用 Zustand 管理客户端积分状态，提供响应式更新和乐观更新支持。

**新建文件**: `apps/nextjs/src/stores/credits-store.ts`

```typescript
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface CreditBalance {
  totalCredits: number;
  usedCredits: number;
  frozenCredits: number;
  availableCredits: number;
  expiringSoon: number;
}

interface CreditsState {
  // 状态
  balance: CreditBalance | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;

  // 操作
  setBalance: (balance: CreditBalance) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 乐观更新
  optimisticFreeze: (credits: number) => void;
  optimisticRelease: (credits: number) => void;

  // 数据获取
  fetchBalance: () => Promise<void>;
  invalidate: () => void;
  reset: () => void;
}

const CACHE_DURATION = 30 * 1000; // 30 seconds

export const useCreditsStore = create<CreditsState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        balance: null,
        isLoading: false,
        error: null,
        lastFetchedAt: null,

        // 基础操作
        setBalance: (balance) =>
          set({ balance, lastFetchedAt: Date.now(), error: null }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error, isLoading: false }),

        // 乐观更新 - 冻结积分
        optimisticFreeze: (credits) => {
          const { balance } = get();
          if (!balance) return;

          set({
            balance: {
              ...balance,
              availableCredits: balance.availableCredits - credits,
              frozenCredits: balance.frozenCredits + credits,
            },
          });
        },

        // 乐观更新 - 释放积分
        optimisticRelease: (credits) => {
          const { balance } = get();
          if (!balance) return;

          set({
            balance: {
              ...balance,
              availableCredits: balance.availableCredits + credits,
              frozenCredits: balance.frozenCredits - credits,
            },
          });
        },

        // 获取积分余额
        fetchBalance: async () => {
          const { isLoading, lastFetchedAt } = get();

          // 防止重复请求
          if (isLoading) return;

          // 使用缓存
          if (lastFetchedAt && Date.now() - lastFetchedAt < CACHE_DURATION) {
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const response = await fetch("/api/v1/credit/balance");
            if (!response.ok) {
              throw new Error("Failed to fetch balance");
            }

            const { data } = await response.json();
            set({
              balance: data,
              isLoading: false,
              lastFetchedAt: Date.now(),
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
          }
        },

        // 使缓存失效
        invalidate: () => set({ lastFetchedAt: null }),

        // 重置状态（登出时调用）
        reset: () =>
          set({
            balance: null,
            isLoading: false,
            error: null,
            lastFetchedAt: null,
          }),
      }),
      {
        name: "credits-storage",
        partialize: (state) => ({
          balance: state.balance,
          lastFetchedAt: state.lastFetchedAt,
        }),
      }
    ),
    { name: "CreditsStore" }
  )
);

// ============================================
// React Hooks
// ============================================

/** 获取积分余额（自动获取） */
export function useCredits() {
  const { balance, isLoading, error, fetchBalance } = useCreditsStore();

  // 自动获取
  React.useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, isLoading, error, refetch: fetchBalance };
}

/** 获取可用积分数量 */
export function useAvailableCredits(): number {
  return useCreditsStore((state) => state.balance?.availableCredits ?? 0);
}

/** 检查积分是否足够 */
export function useHasEnoughCredits(required: number): boolean {
  const available = useAvailableCredits();
  return available >= required;
}
```

**使用示例**:

```typescript
// 在组件中使用
function VideoGenerateButton({ modelId, params }) {
  const { balance, isLoading } = useCredits();
  const optimisticFreeze = useCreditsStore((s) => s.optimisticFreeze);
  const invalidate = useCreditsStore((s) => s.invalidate);

  const cost = calculateModelCredits(modelId, params);
  const canGenerate = balance && balance.availableCredits >= cost;

  const handleGenerate = async () => {
    // 乐观更新
    optimisticFreeze(cost);

    try {
      await generateVideo({ modelId, params });
    } catch (error) {
      // 失败时刷新真实数据
      invalidate();
    }
  };

  return (
    <Button disabled={!canGenerate || isLoading} onClick={handleGenerate}>
      生成视频 ({cost} 积分)
    </Button>
  );
}
```

## 3.8 i18n 国际化支持

> **设计说明**: 使用 next-intl 为积分包名称和功能描述提供多语言支持。

**更新文件**: `apps/nextjs/messages/en.json`

```json
{
  "credits": {
    "features": {
      "100_per_month": "100 credits per month",
      "500_per_month": "500 credits per month",
      "2000_per_month": "2000 credits per month",
      "10s_video": "Up to 10s videos",
      "15s_video": "Up to 15s videos",
      "standard_quality": "Standard quality",
      "high_quality": "HD quality available",
      "priority_queue": "Priority processing queue",
      "all_features": "All features included",
      "api_access": "API access",
      "priority_support": "Priority support",
      "50_credits": "50 credits",
      "300_credits": "300 credits",
      "1000_credits": "1000 credits",
      "365_days_valid": "Valid for 365 days",
      "all_models": "Access to all AI models",
      "best_value": "Best value"
    },
    "packages": {
      "basic": { "name": "Basic", "description": "Great for getting started" },
      "pro": { "name": "Pro", "description": "For serious creators" },
      "team": { "name": "Team", "description": "For teams and businesses" },
      "starter": { "name": "Starter Pack", "description": "Try it out" },
      "standard": { "name": "Standard Pack", "description": "Most popular choice" },
      "premium": { "name": "Premium Pack", "description": "For power users" }
    }
  },
  "models": {
    "sora2": { "description": "High quality video generation with image support" },
    "sora2pro": { "description": "Professional grade with enhanced quality options" }
  }
}
```

**更新文件**: `apps/nextjs/messages/zh.json`

```json
{
  "credits": {
    "features": {
      "100_per_month": "每月 100 积分",
      "500_per_month": "每月 500 积分",
      "2000_per_month": "每月 2000 积分",
      "10s_video": "支持 10 秒视频",
      "15s_video": "支持 15 秒视频",
      "standard_quality": "标准画质",
      "high_quality": "高清画质可用",
      "priority_queue": "优先处理队列",
      "all_features": "全部功能",
      "api_access": "API 访问权限",
      "priority_support": "优先客服支持",
      "50_credits": "50 积分",
      "300_credits": "300 积分",
      "1000_credits": "1000 积分",
      "365_days_valid": "365 天有效期",
      "all_models": "所有 AI 模型",
      "best_value": "超值优选"
    },
    "packages": {
      "basic": { "name": "基础版", "description": "适合入门体验" },
      "pro": { "name": "专业版", "description": "适合深度创作" },
      "team": { "name": "团队版", "description": "适合团队协作" },
      "starter": { "name": "入门包", "description": "体验尝鲜" },
      "standard": { "name": "标准包", "description": "热门之选" },
      "premium": { "name": "尊享包", "description": "重度用户首选" }
    }
  },
  "models": {
    "sora2": { "description": "高质量视频生成，支持图片转视频" },
    "sora2pro": { "description": "专业级画质，多种质量选项" }
  }
}
```

**新建文件**: `apps/nextjs/src/hooks/use-credit-packages.ts`

```typescript
import { useTranslations } from "next-intl";
import {
  CREDITS_CONFIG,
  getSubscriptionProducts,
  getOnetimeProducts,
  type CreditPackageConfig,
} from "@videofly/common/config/credits";

export interface LocalizedPackage extends CreditPackageConfig {
  displayName: string;
  displayDescription: string;
  localizedFeatures: string[];
}

/** 获取本地化的订阅产品列表 */
export function useSubscriptionPackages(): LocalizedPackage[] {
  const t = useTranslations("credits");
  const packages = getSubscriptionProducts();

  return packages.map((pkg) => ({
    ...pkg,
    displayName: t(`packages.${getPackageKey(pkg.id)}.name`),
    displayDescription: t(`packages.${getPackageKey(pkg.id)}.description`),
    localizedFeatures: (pkg.features || []).map((key) => t(key.replace("credits.", ""))),
  }));
}

/** 获取本地化的一次性购买产品列表 */
export function useOnetimePackages(): LocalizedPackage[] {
  const t = useTranslations("credits");
  const packages = getOnetimeProducts();

  return packages.map((pkg) => ({
    ...pkg,
    displayName: t(`packages.${getPackageKey(pkg.id)}.name`),
    displayDescription: t(`packages.${getPackageKey(pkg.id)}.description`),
    localizedFeatures: (pkg.features || []).map((key) => t(key.replace("credits.", ""))),
  }));
}

/** 检查当前用户是否可以购买积分包 */
export function useCanPurchasePackages(hasSubscription: boolean): boolean {
  if (CREDITS_CONFIG.enablePackagesForFreePlan) {
    return true;
  }
  return hasSubscription;
}

// 从产品 ID 获取配置键名
function getPackageKey(productId: string): string {
  // prod_sub_basic -> basic
  // prod_pack_starter -> starter
  const match = productId.match(/prod_(?:sub|pack)_(\w+)/);
  return match ? match[1] : productId;
}
```

**使用示例**:

```typescript
// 在定价页面组件中使用
function PricingPage() {
  const subscriptions = useSubscriptionPackages();
  const onetimePackages = useOnetimePackages();

  return (
    <div>
      <h2>订阅计划</h2>
      {subscriptions.map((pkg) => (
        <PricingCard
          key={pkg.id}
          name={pkg.displayName}
          description={pkg.displayDescription}
          price={pkg.price.amount / 100}
          features={pkg.localizedFeatures}
          popular={pkg.popular}
        />
      ))}

      <h2>积分包</h2>
      {onetimePackages.map((pkg) => (
        <PricingCard
          key={pkg.id}
          name={pkg.displayName}
          description={pkg.displayDescription}
          price={pkg.price.amount / 100}
          features={pkg.localizedFeatures}
          popular={pkg.popular}
        />
      ))}
    </div>
  );
}
```

## 3.9 环境变量

```bash
# 积分系统配置
CREDIT_NEW_USER_ENABLED=true
CREDIT_NEW_USER_AMOUNT=10
CREDIT_NEW_USER_EXPIRY_DAYS=30
CREDIT_PURCHASE_EXPIRY_DAYS=365
CREDIT_SUBSCRIPTION_EXPIRY_DAYS=30
```

## 3.10 验收标准

- [ ] 积分冻结（freeze）正确锁定积分，防止并发超发
- [ ] 积分结算（settle）正确扣除，幂等处理
- [ ] 积分释放（release）正确退回，幂等处理
- [ ] FIFO 过期消费：先过期的积分先消费
- [ ] 新用户赠送正确触发
- [ ] 过期积分定时处理正常（Vercel Cron 见 A2 - A2.3）

---

[← 上一阶段](./02-PHASE2-DATA-LAYER.md) | [返回目录](./00-INDEX.md) | [下一阶段 →](./04-PHASE4-VIDEO-CORE.md)
