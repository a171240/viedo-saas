# VideoFly 最终技术选型方案 V2

## 文档信息
- **版本**: 2.0 (基于 mksaas-template 参考版)
- **更新日期**: 2025-01-16
- **核心原则**: 保持框架版本不变，聚焦选型差异

---

## 📊 选型对比表

| 技术模块 | VideoFly 当前 | mksaas-template | **最终选择** | 变更说明 |
|---------|--------------|----------------|-------------|---------|
| **Next.js** | 15.1.6 | 16.1.0 | **保持 15.1.6** | ❌ 不升级 |
| **React** | 19.0.0 | 19.2.3 | **保持 19.0.0** | ❌ 不升级 |
| **TypeScript** | 5.4.5 | 5.8.3 | **保持 5.4.5** | ❌ 不升级 |
| **ORM** | Kysely 0.27.3 | Drizzle 0.39.3 | **迁移到 Drizzle** | ✅ 变更 |
| **认证** | Better Auth 1.2.5 | Better Auth 1.4.5 | **可选升级 1.4.5** | 🟡 可选 |
| **API 架构** | REST + tRPC | REST + Server Actions | **REST + Server Actions** | ✅ 变更 |
| **Server Actions** | 无 | next-safe-action | **新增 next-safe-action** | ✅ 新增 |
| **样式** | Tailwind 3.4.1 | Tailwind 4.0.14 | **升级到 v4** | ✅ 升级 |
| **工具链** | ESLint + Prettier | Biome | **迁移到 Biome** | ✅ 变更 |
| **类型验证** | Zod 4.2.1 | Zod 4.0.17 | **保持 4.2.1** | ❌ 不变 |
| **状态管理** | TanStack Query | TanStack Query | **保持** | ❌ 不变 |
| **国际化** | next-intl | next-intl | **保持** | ❌ 不变 |
| **存储** | AWS SDK R2 | s3mini R2 | **迁移到 s3mini** | ✅ 变更 |
| **支付** | Stripe (部分) | Stripe | **Stripe + Creem** | ✅ 扩展 |
| **AI SDK** | 自定义抽象 | Vercel AI SDK | **保持自定义** | ❌ 不变 |

---

## 🎯 核心变更总结

### ✅ 需要变更的选型

| # | 选型 | 当前 → 目标 | 影响范围 |
|---|------|-----------|---------|
| 1 | **ORM** | Kysely → Drizzle | 数据库层、所有查询 |
| 2 | **API** | tRPC → Server Actions | 前端调用方式 |
| 3 | **工具链** | ESLint → Biome | 代码检查、格式化 |
| 4 | **存储** | AWS SDK → s3mini | 文件上传、下载 |
| 5 | **样式** | Tailwind v3 → v4 | CSS 配置 |
| 6 | **支付** | Stripe → Stripe + Creem | 支付流程 |

### ❌ 保持不变的部分

| 模块 | 版本 | 理由 |
|------|------|------|
| Next.js | 15.1.6 | 避免兼容性风险 |
| React | 19.0.0 | 当前版本稳定 |
| TypeScript | 5.4.5 | 无需升级 |
| Zod | 4.2.1 | 功能满足 |
| AI 抽象 | 自定义 | 视频专用 |

---

## 一、ORM: Kysely → Drizzle

### 为什么参考 mksaas 选择 Drizzle？

| 对比项 | Kysely | Drizzle | mksaas 选择 |
|--------|--------|---------|-------------|
| **类型安全** | 优秀 | 优秀 | - |
| **学习曲线** | 中等 | 较低 | ✅ |
| **生态工具** | 基础 | 完善 (Kit/Studio) | ✅ |
| **社区活跃** | 中等 | 高 | ✅ |
| **迁移工具** | 手动 | drizzle-kit | ✅ |
| **文档质量** | 中等 | 优秀 | ✅ |

### 代码对比

```typescript
// Kysely (当前)
// packages/db/prisma/schema.prisma + 手动类型

interface Video {
  id: number;
  uuid: string;
  userId: number;
  prompt: string;
  status: VideoStatus;
}

// 查询
const videos = await db
  .selectFrom('videos')
  .where('userId', '=', userId)
  .execute();
```

```typescript
// Drizzle (目标 - 参考 mksaas)
// src/db/schema.ts

import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const videos = pgTable('videos', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  prompt: text('prompt').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// 查询
const videos = await db
  .select()
  .from(videos)
  .where(eq(videos.userId, userId));
```

### 迁移成本

| 项目 | 工作量 | 风险 |
|------|--------|------|
| 重写 Schema | 1 天 | 低 |
| 迁移查询代码 | 2 天 | 中 |
| 测试验证 | 1 天 | 低 |
| **总计** | **4 天** | **中** |

### 参考文件 (mksaas)

```
/Users/cheche/workspace/mksaas-template/
├── drizzle.config.ts          # Drizzle 配置
├── src/db/
│   ├── schema.ts              # Schema 定义 (126 行)
│   ├── index.ts               # 数据库连接
│   └── migrations/            # 迁移文件
```

---

## 二、API: tRPC → Server Actions

### 为什么参考 mksaas 移除 tRPC？

| 对比项 | tRPC | Server Actions | mksaas 选择 |
|--------|------|----------------|-------------|
| **类型安全** | ✅ 自动 | ✅ 自动 (用 SA) | - |
| **客户端复杂度** | 中 | 低 | ✅ |
| **Next.js 支持** | 第三方 | 原生 | ✅ |
| **Webhook 支持** | ❌ | ✅ (用 REST) | ✅ |
| **学习成本** | 高 | 低 | ✅ |
| **依赖** | @trpc/* | 无额外依赖 | ✅ |

### next-safe-action 架构

参考 mksaas 的实现：

```typescript
// src/lib/safe-action.ts
import { createSafeActionClient } from 'next-safe-action';

export const actionClient = createSafeActionClient({
  handleServerError: (e) => {
    return { success: false, error: e.message };
  },
});

// 需要登录
export const userActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return next({ ctx: { user: session.user } });
});
```

### 使用示例

```typescript
// src/actions/generate-video.ts
'use server';

import { userActionClient } from '@/lib/safe-action';
import { z } from 'zod';

export const generateVideoAction = userActionClient
  .schema(z.object({
    prompt: z.string().min(1),
    model: z.string(),
  }))
  .action(async ({ parsedInput, ctx }) => {
    const result = await videoService.generate({
      userId: ctx.user.id,
      ...parsedInput,
    });
    return { success: true, data: result };
  });
```

### 前端调用

```typescript
'use client';

import { generateVideoAction } from '@/actions/generate-video';

export function VideoForm() {
  const { execute, isPending } = useAction(generateVideoAction);

  const handleSubmit = (data) => {
    execute({ prompt: data.prompt, model: data.model });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### API 分层策略

```
API 使用策略:
├── Server Actions      # 表单操作、用户交互
│   ├── 视频生成
│   ├── 积分查询
│   └── 用户操作
│
├── REST API            # Webhook、外部调用
│   ├── /api/v1/video/callback/*   # AI 回调
│   ├── /api/webhooks/stripe       # Stripe webhook
│   ├── /api/webhooks/creem        # Creem webhook
│   └── /api/v1/upload/*           # 文件上传
│
└── tRPC (legacy)       # 逐步废弃
    └── 标记为 @deprecated
```

### 迁移成本

| 项目 | 工作量 | 风险 |
|------|--------|------|
| 集成 next-safe-action | 0.5 天 | 低 |
| 转换 tRPC 端点 | 1 天 | 低 |
| 更新前端调用 | 1 天 | 中 |
| 测试验证 | 0.5 天 | 低 |
| **总计** | **3 天** | **低** |

---

## 三、工具链: ESLint → Biome

### 为什么参考 mksaas 使用 Biome？

| 对比项 | ESLint + Prettier | Biome |
|---------|-----------------|-------|
| **速度** | 基准 | **快 10-100 倍** |
| **配置** | 两个文件 | 一个文件 |
| **依赖** | 多个包 | 一个包 |
| **功能** | 分离 | 统一 |

### Biome 配置 (参考 mksaas)

```json
// biome.json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80,
    "quoteStyle": "single"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "off" }
    }
  },
  "javascript": {
    "formatter": {
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```

### 迁移成本

| 项目 | 工作量 | 风险 |
|------|--------|------|
| 配置 Biome | 0.5 天 | 低 |
| 移除 ESLint/Prettier | 0.5 天 | 低 |
| 修复检查结果 | 0.5 天 | 低 |
| **总计** | **1.5 天** | **低** |

---

## 四、存储: AWS SDK → s3mini

### 为什么参考 mksaas 使用 s3mini？

| 对比项 | AWS SDK | s3mini |
|---------|---------|---------|
| **包大小** | ~2MB | ~50KB |
| **API 复杂度** | 高 | 低 |
| **TypeScript** | 完整 | 足够 |

### s3mini 使用示例

```typescript
import { s3mini } from 's3mini';

const s3 = s3mini({
  endpoint: process.env.STORAGE_ENDPOINT,
  accessKey: process.env.STORAGE_ACCESS_KEY,
  secretKey: process.env.STORAGE_SECRET_KEY,
  region: 'auto',
});

// 上传
await s3.putObject({
  Bucket: process.env.STORAGE_BUCKET,
  Key: `videos/${uuid}.mp4`,
  Body: fileBuffer,
});

// 预签名 URL
const url = s3.presignedGetObject({
  Bucket: process.env.STORAGE_BUCKET,
  Key: `videos/${uuid}.mp4`,
  Expires: 3600,
});
```

### 迁移成本

| 项目 | 工作量 | 风险 |
|------|--------|------|
| 替换存储调用 | 0.5 天 | 低 |
| 测试上传下载 | 0.5 天 | 低 |
| **总计** | **1 天** | **低** |

---

## 五、样式: Tailwind v3 → v4

### 为什么升级到 v4？

| 特性 | v3 | v4 |
|------|-----|-----|
| **编译速度** | 基准 | **快 10x** |
| **CSS 变量** | 手动 | **原生支持** |
| **配置** | tailwind.config.js | CSS `@theme` |
| **PostCSS** | 需要 | 内置 |

### 配置对比

```css
/* Tailwind v3 (当前) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      }
    }
  }
}
```

```css
/* Tailwind v4 (目标) */
@import "tailwindcss";

@theme inline {
  --color-primary: oklch(0.6 0.2 240);
  --font-sans: "Inter", sans-serif;
}
```

### 迁移成本

| 项目 | 工作量 | 风险 |
|------|--------|------|
| 升级依赖 | 0.5 天 | 低 |
| 转换配置 | 0.5 天 | 低 |
| 修复样式问题 | 1 天 | 中 |
| **总计** | **2 天** | **中** |

---

## 六、支付: Stripe + Creem

### 需求分析

```
支付架构:
├── Stripe                    # 国际用户
│   ├── 订阅 (Subscription)
│   └── 积分包 (One-time)
│
└── Creem                     # 国内用户 (主要)
    ├── 加密货币
    ├── 支付宝
    └── 微信支付
```

### 参考 mksaas 的 Stripe 实现

```typescript
// src/payment/provider/stripe.ts
// 参考: /Users/cheche/workspace/mksaas-template/src/payment/provider/stripe.ts

export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    // 创建结账会话
  }

  handleWebhookEvent(payload: string, signature: string): Promise<void> {
    // 处理 webhook
  }

  createCustomerPortal(params: CreatePortalParams): Promise<PortalResult> {
    // 客户门户
  }
}
```

### Creem 集成

```typescript
// src/payment/provider/creem.ts

export class CreemProvider implements PaymentProvider {
  private client: CreemClient;

  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    // 创建 Creem 支付
  }

  handleWebhookEvent(payload: string, signature: string): Promise<void> {
    // 处理 Creem webhook
  }
}
```

### 统一支付接口

```typescript
// src/payment/index.ts

export interface PaymentProvider {
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;
  handleWebhookEvent(payload: string, signature: string): Promise<void>;
}

// 根据用户选择使用不同提供商
export function getPaymentProvider(provider: 'stripe' | 'creem'): PaymentProvider {
  if (provider === 'stripe') return new StripeProvider();
  return new CreemProvider();
}
```

### Webhook 路由

```
src/app/api/webhooks/
├── stripe/route.ts          # Stripe webhook
└── creem/route.ts           # Creem webhook
```

### 迁移成本

| 项目 | 工作量 | 风险 |
|------|--------|------|
| 实现 Stripe (参考 mksaas) | 1.5 天 | 低 |
| 实现 Creem | 2 天 | 中 |
| 统一接口 | 0.5 天 | 低 |
| 测试 | 1 天 | 中 |
| **总计** | **5 天** | **中** |

---

## 七、积分系统: 保留冻结/结算

### 不参考 mksaas 的原因

mksaas-template 的积分系统是**直接扣减**，因为图片生成是同步的。

VideoFly 的视频生成是**异步的**，需要**冻结→结算/释放**机制。

### 保留的机制

```typescript
// src/services/credit.ts

// 1. 冻结积分 (生成开始)
await freezeCredits({
  userId,
  credits: required,
  videoUuid
});

// 2. 结算积分 (生成成功)
await settleCredits(holdId, actualCredits);

// 3. 释放积分 (生成失败)
await releaseCredits(holdId);
```

### 可以参考 mksaas 的部分

| 功能 | mksaas 实现 | 可参考 |
|------|-------------|--------|
| FIFO 排序 | ✅ | ✅ 按过期时间排序 |
| 交易记录 | ✅ | ✅ 详细的历史记录 |
| 过期处理 | ✅ | ✅ 定时任务处理 |
| React Hooks | ✅ | ✅ useCreditBalance 等 |

### 参考文件 (mksaas)

```
/Users/cheche/workspace/mksaas-template/src/credits/
├── credits.ts              # 核心逻辑
├── types.ts
└── server.ts
```

---

## 八、目标目录结构

```
videofly/                                    # 单应用
├── src/
│   ├── actions/                            # Server Actions (新增)
│   │   ├── generate-video.ts
│   │   ├── consume-credits.ts
│   │   ├── get-credit-balance.ts
│   │   └── create-checkout.ts
│   │
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (marketing)/
│   │   │   ├── (dashboard)/
│   │   │   └── auth/
│   │   └── api/
│   │       ├── auth/[...all]/              # Better Auth
│   │       ├── v1/                         # REST API
│   │       │   ├── video/
│   │       │   ├── credit/
│   │       │   └── upload/
│   │       └── webhooks/
│   │           ├── stripe/route.ts
│   │           └── creem/route.ts
│   │
│   ├── components/
│   │   ├── ui/                            # shadcn/ui
│   │   └── video-generator/
│   │
│   ├── db/                                # Drizzle ORM (替换 Kysely)
│   │   ├── schema.ts                      # 参考 mksaas
│   │   ├── index.ts
│   │   └── migrations/
│   │
│   ├── services/                          # 业务逻辑
│   │   ├── credit.ts                      # 保留冻结/结算
│   │   ├── video.ts
│   │   └── storage.ts                     # 改用 s3mini
│   │
│   ├── ai/                                # 保留自定义抽象
│   │   ├── index.ts
│   │   └── providers/
│   │
│   ├── lib/
│   │   ├── auth.ts                        # Better Auth
│   │   ├── safe-action.ts                 # next-safe-action
│   │   └── utils.ts
│   │
│   ├── payment/                           # 支付系统 (参考 mksaas)
│   │   ├── index.ts
│   │   ├── provider/
│   │   │   ├── stripe.ts                  # 参考 mksaas
│   │   │   └── creem.ts                   # 新增
│   │   └── types.ts
│   │
│   ├── credits/                           # 积分系统 (部分参考 mksaas)
│   ├── config/
│   ├── hooks/                             # React Hooks
│   ├── i18n/
│   └── types/
│
├── drizzle.config.ts                       # Drizzle 配置
├── biome.json                              # Biome 配置
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 九、迁移优先级和时间估算

### P0 - 必须变更

| # | 任务 | 工作量 | 依赖 |
|---|------|--------|------|
| 1 | ORM: Kysely → Drizzle | 4天 | 无 |
| 2 | 集成 next-safe-action | 1天 | 无 |
| 3 | 迁移 tRPC → Server Actions | 2天 | 2 |
| 4 | 工具链: ESLint → Biome | 1.5天 | 无 |
| 5 | 存储: AWS SDK → s3mini | 1天 | 无 |

**P0 小计**: **9.5 天**

### P1 - 重要变更

| # | 任务 | 工作量 | 依赖 |
|---|------|--------|------|
| 6 | 样式: Tailwind v3 → v4 | 2天 | 无 |
| 7 | 支付: 实现 Stripe (参考 mksaas) | 1.5天 | 1 |
| 8 | 支付: 实现 Creem | 2天 | 无 |
| 9 | 积分系统优化 (参考 mksaas) | 1天 | 1 |

**P1 小计**: **6.5 天**

### 总计: **16 天** (约 3-4 周)

---

## 十、依赖版本汇总

### 保持不变的版本

```json
{
  "next": "15.1.6",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "typescript": "5.4.5",
  "zod": "4.2.1",
  "@tanstack/react-query": "当前版本",
  "next-intl": "当前版本"
}
```

### 需要新增/变更的依赖

```json
{
  "drizzle-orm": "^0.39.3",
  "drizzle-kit": "^0.30.4",
  "postgres": "^3.4.5",
  "next-safe-action": "^8.0.11",
  "s3mini": "^0.2.0",
  "tailwindcss": "^4.0.14",
  "biome": "^1.9.4"
}
```

### 需要移除的依赖

```json
{
  "移除": [
    "@trpc/server",
    "@trpc/client",
    "@trpc/react-query",
    "eslint",
    "prettier",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner"
  ]
}
```

---

## 十一、mksaas-template 参考文件清单

### 需要参考的核心文件

| 功能 | 文件路径 | 用途 |
|------|---------|------|
| **Drizzle 配置** | `/mksaas-template/drizzle.config.ts` | 配置参考 |
| **Schema 定义** | `/mksaas-template/src/db/schema.ts` | 表结构参考 |
| **DB 连接** | `/mksaas-template/src/db/index.ts` | 连接方式 |
| **Better Auth** | `/mksaas-template/src/lib/auth.ts` | 认证配置 |
| **Server Actions** | `/mksaas-template/src/lib/safe-action.ts` | SA 封装 |
| **积分系统** | `/mksaas-template/src/credits/credits.ts` | FIFO 逻辑 |
| **Stripe 支付** | `/mksaas-template/src/payment/provider/stripe.ts` | 支付实现 |
| **Biome 配置** | `/mksaas-template/biome.json` | 工具配置 |
| **Tailwind v4** | `/mksaas-template/src/styles/globals.css` | 样式配置 |
| **类型定义** | `/mksaas-template/src/payment/types.ts` | 接口参考 |

---

## 十二、决策确认清单

在开始迁移前，请确认以下决策：

- [ ] **ORM**: 同意从 Kysely 迁移到 Drizzle？
- [ ] **API**: 同意移除 tRPC，使用 Server Actions？
- [ ] **工具链**: 同意迁移到 Biome？
- [ ] **存储**: 同意迁移到 s3mini？
- [ ] **样式**: 同意升级到 Tailwind v4？
- [ ] **支付**: Stripe + Creem，前期主要用 Creem？
- [ ] **积分系统**: 保留冻结/结算机制？
- [ ] **AI**: 保留自定义抽象，不使用 Vercel AI SDK？

---

**文档结束**

确认以上决策后，即可开始执行迁移。
