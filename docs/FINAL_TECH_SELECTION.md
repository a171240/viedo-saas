# VideoFly 最终技术选型方案 (基于 mksaas-template)

## 文档信息
- **版本**: 2.0 (基于 mksaas-template 参考版)
- **创建日期**: 2025-01-16
- **参考项目**: /Users/cheche/workspace/mksaas-template

---

## 一、技术选型对比表

| 技术模块 | VideoFly 当前 | mksaas-template | **最终选择** | 变更原因 |
|---------|--------------|----------------|-------------|---------|
| **Next.js** | 15.1.6 | 16.1.0 | **升级到 16.1.0** | 更好的性能 |
| **React** | 19.0.0 | 19.2.3 | **升级到 19.2.3** | 最新稳定版 |
| **TypeScript** | 5.4.5 | 5.8.3 | **升级到 5.8.3** | 更好的类型推断 |
| **ORM** | Kysely 0.27.3 | Drizzle 0.39.3 | **迁移到 Drizzle** | 生态更成熟，参考模板 |
| **认证** | Better Auth 1.2.5 | Better Auth 1.4.5 | **升级到 1.4.5** | 保持一致 + 新版本 |
| **API 架构** | REST + tRPC | REST + Server Actions | **REST + Server Actions** | 移除 tRPC |
| **Server Actions** | 无 | next-safe-action | **新增 next-safe-action** | 类型安全的 SA |
| **样式** | Tailwind 3.4.1 | Tailwind 4.0.14 | **升级到 Tailwind v4** | 性能提升 |
| **工具链** | ESLint + Prettier | Biome | **迁移到 Biome** | 快 10-100 倍 |
| **类型验证** | Zod 4.2.1 | Zod 4.0.17 | **保持 Zod 4.x** | 功能对等 |
| **状态管理** | TanStack Query | TanStack Query | **保持** | 都在使用 |
| **国际化** | next-intl | next-intl | **保持** | 都在使用 |
| **存储** | AWS SDK R2 | s3mini R2 | **迁移到 s3mini** | 更轻量 |
| **支付** | Stripe + Creem | Stripe | **先完成 Stripe** | 参考 mksaas |
| **AI SDK** | 自定义抽象 | Vercel AI SDK | **评估后决定** | 见下方分析 |
| **数据库** | PostgreSQL | PostgreSQL | **保持** | 一致 |

---

## 二、详细决策说明

### 🔴 决策 1: ORM 从 Kysely 迁移到 Drizzle

**选择**: **Drizzle ORM 0.39.3**

**理由**:
1. ✅ **mksaas-template 使用 Drizzle** - 代码可直接参考
2. ✅ **更好的生态系统** - Drizzle Kit、Drizzle Studio
3. ✅ **更强的类型推断** - 编译时类型检查更严格
4. ✅ **活跃的社区** - GitHub Stars 19.4k vs 3.6k
5. ✅ **更好的文档** - 中文文档丰富

**迁移成本**: 中等 (2-3 天)

**Schema 对比示例**:

```typescript
// Kysely (当前)
import { Generated } from 'kysely';

interface UserTable {
  id: Generated<string>;
  name: string;
  email: string;
  created_at: Generated<Date>;
}

// Drizzle (目标)
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**迁移步骤**:
1. 安装 Drizzle: `pnpm add drizzle-orm postgres`
2. 创建 `drizzle.config.ts`
3. 重写 schema 定义
4. 运行 `drizzle-kit generate` 生成迁移
5. 更新所有数据库查询

---

### 🟡 决策 2: 升级到 Better Auth 1.4.5

**选择**: **Better Auth 1.4.5** (升级)

**理由**:
1. ✅ **版本对齐** - 与 mksaas-template 一致
2. ✅ **新功能** - admin 插件、emailHarmony
3. ✅ **Bug 修复** - 更稳定

**配置参考 mksaas**:

```typescript
// src/lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { emailHarmony } from 'better-auth-harmony';

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  database: drizzleAdapter(db, { provider: 'pg' }),
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin({
      defaultBanExpiresIn: undefined,
    }),
    emailHarmony({
      allowNormalizedSignin: false,
    }),
  ],
});
```

---

### 🟡 决策 3: 移除 tRPC，采用 Server Actions

**选择**: **移除 tRPC，使用 next-safe-action**

**理由**:
1. ✅ **mksaas-template 不使用 tRPC** - 证明 SA 足够用
2. ✅ **Next.js 原生支持** - Server Actions 是未来方向
3. ✅ **类型安全** - next-safe-action 提供完整的类型推断
4. ✅ **减少依赖** - 移除 tRPC 简化架构

**next-safe-action 架构**:

```typescript
// src/lib/safe-action.ts
import { createSafeActionClient } from 'next-safe-action';

// 1. 基础客户端
export const actionClient = createSafeActionClient({
  handleServerError: (e) => {
    if (e instanceof Error) return { success: false, error: e.message };
    return { success: false, error: 'Something went wrong' };
  },
});

// 2. 需要登录的客户端
export const userActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: 'Unauthorized' };
  }
  return next({ ctx: { user: session.user } });
});

// 3. 管理员客户端
export const adminActionClient = userActionClient.use(async ({ next, ctx }) => {
  if (ctx.user.role !== 'admin') {
    return { success: false, error: 'Forbidden' };
  }
  return next({ ctx });
});
```

**使用示例**:

```typescript
// src/actions/generate-video.ts
'use server';

import { userActionClient } from '@/lib/safe-action';
import { z } from 'zod';
import { videoService } from '@/services/video';

const generateSchema = z.object({
  prompt: z.string().min(1),
  model: z.string(),
  duration: z.number().optional(),
});

export const generateVideoAction = userActionClient
  .schema(generateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const result = await videoService.generate({
      userId: ctx.user.id,
      ...parsedInput,
    });
    return { success: true, data: result };
  });
```

**迁移策略**:
- **保留 REST API** 用于 webhook 和外部调用
- **新增 Server Actions** 用于表单和用户操作
- **逐步废弃 tRPC** (标记为 legacy)

---

### 🟢 决策 4: 升级到 Tailwind CSS v4

**选择**: **Tailwind CSS 4.0.14**

**理由**:
1. ✅ **性能提升** - 编译速度更快
2. ✅ **CSS 变量主题** - 更灵活的主题定制
3. ✅ **mksaas-template 使用** - 经过验证

**配置对比**:

```css
/* Tailwind v3 (当前) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Tailwind v4 (目标) */
@import "tailwindcss";

@theme inline {
  --color-primary: oklch(0.627 0.265 149.214);
  --font-sans: "Inter", sans-serif;
}
```

---

### 🟢 决策 5: 迁移到 Biome

**选择**: **Biome 替代 ESLint + Prettier**

**理由**:
1. ✅ **速度快 10-100 倍** - 大项目体验明显
2. ✅ **功能统一** - Lint + Format 一个工具
3. ✅ **零配置** - 开箱即用

**biome.json 配置**:

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
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
      "quoteStyle": "single",
      "trailingCommas": "es5",
      "semicolons": "always"
    }
  }
}
```

**package.json scripts**:

```json
{
  "lint": "biome check --write .",
  "format": "biome format --write .",
  "check": "biome check ."
}
```

---

### 🟢 决策 6: 迁移到 s3mini

**选择**: **s3mini 替代 AWS SDK**

**理由**:
1. ✅ **更轻量** - 打包体积更小
2. ✅ **更简单** - API 更简洁
3. ✅ **mksaas-template 使用** - 经过验证

**使用示例**:

```typescript
import { s3mini } from 's3mini';

const s3 = s3mini({
  endpoint: process.env.STORAGE_ENDPOINT,
  accessKey: process.env.STORAGE_ACCESS_KEY,
  secretKey: process.env.STORAGE_SECRET_KEY,
  region: 'auto',
});

// 上传文件
await s3.putObject({
  Bucket: process.env.STORAGE_BUCKET,
  Key: `videos/${uuid}.mp4`,
  Body: fileBuffer,
});

// 获取预签名 URL
const url = s3.presignedGetObject({
  Bucket: process.env.STORAGE_BUCKET,
  Key: `videos/${uuid}.mp4`,
  Expires: 3600,
});
```

---

### 🟡 决策 7: AI SDK 选择

**选项对比**:

| 方案 | 优点 | 缺点 | mksaas 支持 |
|------|------|------|-------------|
| **保留自定义抽象** | • 已实现<br>• 针对视频优化 | • 维护成本<br>• 功能有限 | ❌ |
| **Vercel AI SDK** | • 统一抽象<br>• 社区活跃 | • 视频支持有限 | ✅ |
| **混合方案** | • 平衡优势 | • 架构复杂 | ⚠️ |

**我的建议**: **保留自定义抽象，原因如下**:

1. **视频生成是核心业务** - Vercel AI SDK 主要针对文本/图片
2. **已有实现稳定** - evolink 和 kie 适配器运行良好
3. **视频特殊性** - 回调、轮询、长时间处理

**但可以借鉴**:
- ✅ 使用 next-safe-action 封装 AI 调用
- ✅ 参考 mksaas 的错误处理模式
- ✅ 统一的配置管理

---

## 三、积分系统处理

### VideoFly vs mksaas 积分系统对比

| 特性 | VideoFly | mksaas-template | 建议 |
|------|----------|----------------|------|
| **FIFO 消费** | ✅ | ✅ | 保持 |
| **冻结机制** | ✅ | ❌ | **保留** (VideoFly 特色) |
| **结算机制** | ✅ | ❌ | **保留** (视频生成必需) |
| **过期处理** | ✅ | ✅ | 参考 mksaas 优化 |
| **交易记录** | ✅ | ✅ | 参考 mksaas 优化 |

**建议**: **保留 VideoFly 的冻结/结算机制**

这是 VideoFly 的核心优势，用于处理异步视频生成的积分扣减。mksaas 的图片生成是同步的，不需要这个机制。

---

## 四、最终技术栈

### 核心依赖

```json
{
  "dependencies": {
    "next": "16.1.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "typescript": "5.8.3",
    "drizzle-orm": "0.39.3",
    "drizzle-kit": "0.30.4",
    "postgres": "3.4.5",
    "better-auth": "1.4.5",
    "better-auth-harmony": "1.2.5",
    "next-safe-action": "8.0.11",
    "tailwindcss": "4.0.14",
    "zod": "4.0.17",
    "@tanstack/react-query": "5.85.5",
    "s3mini": "0.2.0",
    "stripe": "17.6.0",
    "next-intl": "4.5.8",
    "biome": "1.9.4"
  }
}
```

### 目录结构 (参考 mksaas-template)

```
videofly/
├── src/
│   ├── actions/              # Server Actions (next-safe-action)
│   │   ├── generate-video.ts
│   │   ├── consume-credits.ts
│   │   └── ...
│   │
│   ├── app/                  # Next.js App Router
│   │   ├── [locale]/
│   │   │   ├── (marketing)/
│   │   │   ├── (protected)/
│   │   │   └── (dashboard)/
│   │   └── api/             # REST API
│   │       ├── auth/[...all]/
│   │       ├── v1/          # REST API v1
│   │       └── webhooks/
│   │
│   ├── components/          # React 组件
│   │   ├── ui/             # shadcn/ui
│   │   ├── video-generator/
│   │   └── ...
│   │
│   ├── db/                  # Drizzle ORM
│   │   ├── schema.ts       # Schema 定义
│   │   ├── index.ts        # DB 连接
│   │   └── migrations/     # 迁移文件
│   │
│   ├── services/            # 业务逻辑
│   │   ├── credit.ts       # 积分服务 (保留冻结/结算)
│   │   ├── video.ts        # 视频服务
│   │   └── storage.ts
│   │
│   ├── ai/                  # AI 提供商 (保留自定义)
│   │   ├── index.ts
│   │   ├── providers/
│   │   └── types.ts
│   │
│   ├── lib/                 # 工具库
│   │   ├── auth.ts         # Better Auth 配置
│   │   ├── safe-action.ts  # next-safe-action 配置
│   │   └── utils.ts
│   │
│   ├── config/              # 配置
│   │   ├── credits.ts
│   │   ├── models.ts
│   │   └── website.tsx     # 参考 mksaas
│   │
│   ├── credits/             # 积分系统 (参考 mksaas 优化)
│   │   ├── credits.ts
│   │   └── types.ts
│   │
│   ├── payment/             # 支付系统 (参考 mksaas)
│   │   ├── provider/
│   │   │   └── stripe.ts
│   │   └── types.ts
│   │
│   ├── hooks/               # React Hooks
│   ├── i18n/
│   ├── types/
│   └── styles/
│
├── public/
├── messages/                # 国际化
├── drizzle.config.ts        # Drizzle 配置
├── biome.json              # Biome 配置
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 五、迁移优先级

### P0 - 必须迁移 (参考 mksaas)

| 任务 | 预估时间 | 依赖 |
|------|---------|------|
| 1. 升级 Next.js 到 16.1.0 | 0.5天 | 无 |
| 2. 升级 React 到 19.2.3 | 0.5天 | 无 |
| 3. 迁移到 Drizzle ORM | 2-3天 | 无 |
| 4. 升级 Better Auth 到 1.4.5 | 1天 | 3 |
| 5. 集成 next-safe-action | 1天 | 4 |
| 6. 迁移到 Biome | 0.5天 | 无 |
| 7. 参考mksaas实现Stripe支付 | 2天 | 3 |

**P0 总计**: 7.5-8.5 天

### P1 - 建议迁移 (参考 mksaas)

| 任务 | 预估时间 | 依赖 |
|------|---------|------|
| 8. 升级到 Tailwind v4 | 1天 | 无 |
| 9. 迁移到 s3mini | 0.5天 | 无 |
| 10. 优化积分系统 (参考mksaas) | 1天 | 3 |
| 11. 参考mksaas优化项目结构 | 1天 | 3 |

**P1 总计**: 3.5 天

### P2 - 可选迁移

| 任务 | 预估时间 |
|------|---------|
| 12. 移除 tRPC | 2天 |
| 13. 集成 Vercel AI SDK | 3天 |

**P2 总计**: 5 天

---

## 六、与原迁移方案的主要变化

| 决策点 | 原方案 | 新方案 (参考 mksaas) | 变化 |
|--------|--------|---------------------|------|
| **ORM** | 保持 Kysely | 迁移到 Drizzle | ⚠️ **重大变更** |
| **迁移方式** | 渐进式 | 一次性 (因为要换 ORM) | ⚠️ **重大变更** |
| **API 架构** | 保留 tRPC | 移除 tRPC，用 SA | ⚠️ **重大变更** |
| **工具链** | ESLint+Prettier | Biome | 中等变更 |
| **样式** | Tailwind v3 | Tailwind v4 | 中等变更 |
| **存储** | AWS SDK | s3mini | 小变更 |

---

## 七、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **ORM 迁移风险** | 高 | 1. 充分测试<br>2. 保留 Kysely 代码作为参考<br>3. 分阶段迁移 |
| **移除 tRPC 影响现有功能** | 中 | 1. 逐步迁移<br>2. 并行运行一段时间<br>3. 标记为 legacy |
| **Tailwind v4 兼容性** | 低 | 1. mksaas 已验证<br>2. 小改动即可回滚 |
| **Biome 规则差异** | 低 | 1. 可调整规则<br>2. 不影响功能 |

---

## 八、最终建议

### 推荐方案

```
┌─────────────────────────────────────────────┐
│  基于 mksaas-template 的完整技术迁移方案      │
├─────────────────────────────────────────────┤
│                                             │
│  核心变更:                                   │
│  ├─ ORM: Kysely → Drizzle ORM              │
│  ├─ 框架: Next.js 15 → 16                   │
│  ├─ API: 移除 tRPC，使用 Server Actions     │
│  ├─ 工具: ESLint → Biome                    │
│  └─ 存储: AWS SDK → s3mini                  │
│                                             │
│  保留部分:                                   │
│  ├─ 积分系统冻结/结算机制                    │
│  ├─ 自定义 AI 提供商抽象                     │
│  └─ Better Auth (升级版本)                  │
│                                             │
│  参考优化:                                   │
│  ├─ Stripe 支付实现                         │
│  ├─ 项目结构组织                             │
│  └─ 积分过期处理                             │
│                                             │
└─────────────────────────────────────────────┘
```

### 时间估算 (P0 + P1)

```
阶段一: 基础设施升级 (3天)
  - Next.js/React 升级
  - Biome 配置
  - Tailwind v4

阶段二: 数据库层迁移 (3天)
  - Kysely → Drizzle
  - Schema 重写
  - 测试验证

阶段三: 业务逻辑迁移 (4天)
  - Better Auth 升级
  - next-safe-action 集成
  - 积分系统优化
  - Stripe 支付集成

阶段四: 存储和优化 (2天)
  - s3mini 迁移
  - 项目结构调整
  - 全面测试

总计: 12 天 (约 2.5 周)
```

---

## 九、决策记录

### 已确认决策

- [x] **ORM**: 迁移到 Drizzle
- [x] **Next.js**: 升级到 16.1.0
- [x] **API**: 移除 tRPC，使用 Server Actions
- [x] **工具链**: 迁移到 Biome
- [x] **存储**: 迁移到 s3mini
- [x] **支付**: 先完成 Stripe (参考 mksaas)
- [x] **积分系统**: 保留冻结/结算机制
- [x] **AI**: 保留自定义抽象

### 待确认决策

- [ ] **迁移时间**: 何时开始?
- [ ] **测试环境**: 是否需要单独环境?
- [ ] **回滚方案**: 详细计划?
- [ ] **Creem 支付**: Stripe 完成后的优先级?

---

## 十、下一步行动

1. **审查此方案** - 确认所有决策点
2. **创建迁移分支** - `migration/mksaas-based`
3. **开始 P0 任务** - 从 Next.js 升级开始
4. **建立每日同步** - 跟踪进度和问题

---

**文档结束**

此方案基于对 mksaas-template 的深入分析，结合 VideoFly 的业务需求制定。
