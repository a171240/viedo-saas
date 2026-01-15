# Phase 6: Creem 支付集成

[← 上一阶段](./05-PHASE5-FRONTEND.md) | [返回目录](./00-INDEX.md) | [附录 →](./A1-FILES-AND-ENV.md)

---

## 6.1 目标

- 使用 Better Auth Creem 插件集成支付系统
- **支持双模式：订阅制 (Subscription) + 一次性购买 (One-time purchase)**
- 支付成功后自动充值积分（使用 Phase 3 的积分包机制）

> **重要**: Creem 提供了专用的 Better Auth 插件 `@creem_io/better-auth`，可无缝集成。
> 详细 API 文档见 [API-INTEGRATION-GUIDE.md](../API-INTEGRATION-GUIDE.md#4-creem-支付-api-集成)

## 6.2 产品设计

### 两种购买模式

| 模式 | 类型 | 特点 | 积分过期时间 |
|------|------|------|--------------|
| **订阅制** | Subscription | 每月自动续费，每月获得固定积分 | 30 天（配置）|
| **一次性购买** | One-time | 单次购买，永久有效（相对） | 365 天（配置）|

### Creem 产品配置建议

在 Creem Dashboard 创建以下产品：

**订阅产品 (Subscription)**:
- `prod_sub_basic`: 基础订阅 $9.9/月，每月 100 积分
- `prod_sub_pro`: 专业订阅 $29.9/月，每月 500 积分
- `prod_sub_team`: 团队订阅 $99.9/月，每月 2000 积分

**一次性购买产品 (One-time)**:
- `prod_pack_starter`: 入门包 $4.9，50 积分
- `prod_pack_standard`: 标准包 $19.9，300 积分
- `prod_pack_premium`: 高级包 $49.9，1000 积分

## 6.3 详细任务

### 6.3.1 安装依赖

```bash
pnpm add @creem_io/better-auth
```

### 6.3.2 统一配置文件

> **配置已合并**: Creem 产品配置已合并到 Phase 3 的统一配置文件 `packages/common/src/config/credits.ts`。
> 只需在该文件维护订阅/一次性产品与过期策略。

使用方式：
```typescript
import {
  getSubscriptionProducts,
  getOnetimeProducts,
  type CreditPackageConfig,
} from "@videofly/common/config/credits";

const SUBSCRIPTION_PRODUCTS = getSubscriptionProducts();
const ONETIME_PRODUCTS = getOnetimeProducts();
```

### 6.3.3 服务端配置

**修改文件**: `packages/auth/index.ts`

> **注意**: onGrantAccess 需要幂等性保护，生产环境请使用支付/订阅 ID 作为唯一订单号，详见 [A2 - A2.5](./A2-SUPPLEMENTARY-IMPL.md#a25-creem-ongrantaccess-幂等性保护)。

```typescript
import { betterAuth } from "better-auth";
import { creem } from "@creem_io/better-auth";
import { creditService } from "@videofly/common/services/credit";
import { CreditTransType } from "@prisma/client";
import { getProductById, getProductExpiryDays } from "@videofly/common/config/credits";
import { db } from "@videofly/db";

export const auth = betterAuth({
  database: {
    // 现有数据库配置
  },
  plugins: [
    // 现有插件...
    creem({
      apiKey: process.env.CREEM_API_KEY!,
      webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
      testMode: process.env.NODE_ENV !== "production",
      persistSubscriptions: true, // 持久化订阅状态

      /**
       * 支付成功回调 - 充值积分
       *
       * 订阅制: 每次续费都会触发，使用 subscription 过期时间
       * 一次性购买: 仅触发一次，使用 purchase 过期时间
       */
      onGrantAccess: async ({ customer, product, metadata, isRenewal }) => {
        console.log("Creem access granted:", {
          customer,
          product,
          isRenewal,
        });

        const productConfig = getProductById(product.id);
        if (!productConfig) {
          console.error(`Unknown product: ${product.id}`);
          return;
        }

        const credits = productConfig.credits;
        if (credits <= 0) return;

        // ========================================
        // 幂等性保护：使用 Creem 支付/订阅 ID 作为唯一标识
        // ========================================
        const paymentId = metadata?.paymentId || metadata?.subscriptionId;
        const orderNo = paymentId
          ? `creem_${paymentId}`
          : `creem_${productConfig.type}_${customer.userId}_${Date.now()}`;

        // 检查是否已处理过此支付
        const existingPackage = await db.creditPackage.findFirst({
          where: { orderNo },
        });

        if (existingPackage) {
          console.log(`[Creem] Duplicate webhook ignored: ${orderNo}`);
          return; // 幂等：已处理过，直接返回
        }

        // 确定交易类型
        const transType = productConfig.type === "subscription"
          ? CreditTransType.SUBSCRIPTION
          : CreditTransType.ORDER_PAY;

        // 充值积分（创建积分包）
        await creditService.recharge({
          userId: customer.userId,
          credits,
          orderNo,
          transType,
          expiryDays: getProductExpiryDays(productConfig),
          remark: isRenewal
            ? `Subscription renewal: ${productConfig.name}`
            : `Payment: ${productConfig.name}`,
        });

        console.log(`Credited ${credits} to user ${customer.userId}, expiryDays=${getProductExpiryDays(productConfig)}`);
      },

      /**
       * 订阅取消/过期回调
       * 注意：已充值的积分不会被收回，仅停止后续续费
       */
      onRevokeAccess: async ({ customer, product, metadata }) => {
        console.log("Creem access revoked:", { customer, product });
        // 订阅取消后，已发放的积分仍可使用至过期
        // 如需特殊处理（如降级功能），可在此添加逻辑
      },
    }),
  ],
});
```

### 6.3.4 客户端配置

**修改文件**: `apps/nextjs/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";
import { creemClient } from "@creem_io/better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    creemClient(),
  ],
});

// 导出 Creem 方法供组件使用
export const { creem } = authClient;
```

### 6.3.5 双模式定价页面

> **重要**: 支持订阅制和一次性购买两种模式，用户可以选择最适合自己的方式。

**新建文件**: `apps/nextjs/src/app/[lang]/(marketing)/pricing/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { creem } from "~/lib/auth-client";
import { Button } from "@videofly/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@videofly/ui/tabs";
import { Badge } from "@videofly/ui/badge";
import { cn } from "@videofly/ui";
import { toast } from "sonner";
import {
  useSubscriptionPackages,
  useOnetimePackages,
  type LocalizedPackage,
} from "~/hooks/use-credit-packages";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

function PricingCard({
  product,
  isSubscription,
  onPurchase,
}: {
  product: LocalizedPackage;
  isSubscription: boolean;
  onPurchase: (productId: string) => void;
}) {
  return (
    <div
      className={cn(
        "border rounded-lg p-6 flex flex-col relative",
        product.popular && "border-primary shadow-lg"
      )}
    >
      {product.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}

      <h3 className="text-2xl font-bold">{product.displayName}</h3>

      <div className="text-4xl font-bold my-4">
        {formatPrice(product.price.amount)}
        <span className="text-sm text-muted-foreground">
          {isSubscription ? "/month" : ""}
        </span>
      </div>

      <p className="text-muted-foreground mb-4">
        {product.credits} credits
        {isSubscription ? "/month" : ""}
      </p>

      <ul className="flex-1 space-y-2 mb-6">
        {product.localizedFeatures.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={product.popular ? "default" : "outline"}
        onClick={() => onPurchase(product.id)}
      >
        {isSubscription ? "Subscribe" : "Buy Now"}
      </Button>
    </div>
  );
}

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<"subscription" | "onetime">("subscription");

  // 使用 Phase 3 的 i18n hooks 获取本地化产品列表
  const subscriptionProducts = useSubscriptionPackages();
  const onetimeProducts = useOnetimePackages();

  const handlePurchase = async (productId: string) => {
    try {
      const { data, error } = await creem.createCheckout({
        productId,
        successUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/pricing`,
      });

      if (error) {
        toast.error(error.message || "Failed to create checkout");
        return;
      }

      // 重定向到 Creem 支付页面
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="container py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get credits to generate AI videos. Subscribe for monthly credits
          or purchase credit packs for one-time use.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="max-w-5xl mx-auto"
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
          <TabsTrigger value="subscription">
            Monthly Subscription
          </TabsTrigger>
          <TabsTrigger value="onetime">
            Credit Packs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscription">
          <div className="text-center mb-8">
            <p className="text-muted-foreground">
              Subscribe and receive credits every month. Cancel anytime.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {subscriptionProducts.map((product) => (
              <PricingCard
                key={product.id}
                product={product}
                isSubscription={true}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="onetime">
          <div className="text-center mb-8">
            <p className="text-muted-foreground">
              Purchase credits once, use them anytime within 365 days.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {onetimeProducts.map((product) => (
              <PricingCard
                key={product.id}
                product={product}
                isSubscription={false}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          <details className="border rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">
              What's the difference between subscription and credit packs?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Subscriptions give you fresh credits every month and auto-renew.
              Credit packs are one-time purchases that don't expire for 365 days.
              Choose subscription for regular usage, or credit packs for occasional use.
            </p>
          </details>
          <details className="border rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">
              Do unused credits roll over?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Subscription credits expire after 30 days.
              Credit pack credits last for 365 days.
              We always use credits closest to expiration first (FIFO).
            </p>
          </details>
          <details className="border rounded-lg p-4">
            <summary className="font-semibold cursor-pointer">
              Can I cancel my subscription?
            </summary>
            <p className="mt-2 text-muted-foreground">
              Yes! You can cancel anytime from your dashboard.
              Your remaining credits will still be usable until they expire.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
```

### 6.3.6 订阅管理组件

**新建文件**: `apps/nextjs/src/components/subscription-manager.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { creem } from "~/lib/auth-client";
import { Button } from "@videofly/ui/button";

export function SubscriptionManager() {
  const [hasAccess, setHasAccess] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    const { data } = await creem.hasAccessGranted();
    setHasAccess(data?.hasAccess || false);
    setSubscription(data?.subscription);
    setLoading(false);
  };

  const handleManageSubscription = async () => {
    const { data, error } = await creem.createPortal();
    if (data?.portalUrl) {
      window.location.href = data.portalUrl;
    }
  };

  const handleCancelSubscription = async () => {
    if (confirm("Are you sure you want to cancel your subscription?")) {
      const { error } = await creem.cancelSubscription();
      if (!error) {
        await checkSubscription();
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground mb-4">No active subscription</p>
        <Button asChild>
          <a href="/pricing">View Plans</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Active Subscription</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Status: {subscription?.status}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleManageSubscription}>
          Manage Subscription
        </Button>
        <Button variant="destructive" onClick={handleCancelSubscription}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

### 6.3.7 数据库 Schema 扩展（可选）

如果启用了 `persistSubscriptions: true`，Creem 插件会自动管理订阅表。
如需自定义，可添加以下 Schema：

**修改文件**: `packages/db/prisma/schema.prisma`

```prisma
// Creem 订阅记录（由 Better Auth Creem 插件管理）
model CreemSubscription {
  id                String    @id @default(uuid())
  userId            String    @map("user_id")
  productId         String    @map("product_id")
  subscriptionId    String    @unique @map("subscription_id")
  status            String    // active, cancelled, expired
  currentPeriodEnd  DateTime? @map("current_period_end")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  user              BetterAuthUser @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("creem_subscriptions")
}
```

## 6.4 验收标准

- [ ] `@creem_io/better-auth` 插件正确配置
- [ ] 创建 Checkout 成功跳转到 Creem 支付页面
- [ ] 支付成功后 `onGrantAccess` 回调正确执行
- [ ] 积分正确充值到用户账户
- [ ] 订阅管理页面正常工作
- [ ] 可切换 Stripe/Creem（通过配置）

---

[← 上一阶段](./05-PHASE5-FRONTEND.md) | [返回目录](./00-INDEX.md) | [附录 →](./A1-FILES-AND-ENV.md)
