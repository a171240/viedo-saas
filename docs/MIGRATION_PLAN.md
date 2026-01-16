# VideoFly Monorepo 到单应用迁移方案

## 文档版本

- **版本**: 1.0
- **创建日期**: 2025-01-16
- **状态**: 待审批

---

## 一、项目概述

### 1.1 当前架构

VideoFly 当前使用 Turborepo + pnpm workspace 的 monorepo 架构：

```
videofly/
├── apps/
│   ├── nextjs/              # 主 Next.js 应用
│   └── auth-proxy/          # 认证代理服务
├── packages/
│   ├── api/                 # tRPC API 路由
│   ├── auth/                # Better Auth 配置
│   ├── common/              # 核心业务逻辑 (AI、积分、存储)
│   ├── db/                  # 数据库 schema + Kysely
│   ├── stripe/              # Stripe 支付集成
│   ├── ui/                  # shadcn/ui 组件库
│   └── video-generator/     # 视频生成器组件
└── tooling/                 # 共享工具配置
```

### 1.2 目标架构

迁移到单个 Next.js 应用，参考 mksaas-template 和 sora2app-video 的架构模式：

```
videofly/
├── src/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React 组件
│   ├── db/                  # 数据库层
│   ├── services/            # 业务逻辑服务
│   ├── lib/                 # 工具和配置
│   ├── ai/                  # AI 提供商抽象
│   ├── config/              # 应用配置
│   ├── hooks/               # React Hooks
│   ├── i18n/                # 国际化
│   ├── types/               # TypeScript 类型
│   └── actions/             # Server Actions
├── public/                  # 静态资源
├── messages/                # 翻译文件
├── scripts/                 # 工具脚本
└── docs/                    # 文档
```

---

## 二、迁移目标

### 2.1 主要目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| 简化架构 | 消除 monorepo 复杂性，降低维护成本 | P0 |
| 提升构建速度 | 减少 Turborepo 构建开销 | P0 |
| 统一依赖管理 | 单一 package.json，简化版本管理 | P1 |
| 保留功能完整性 | 确保所有现有功能正常工作 | P0 |
| 优化开发体验 | 简化本地开发流程 | P1 |

### 2.2 非目标

- 不修改核心业务逻辑
- 不更改数据库结构
- 不重构 API 接口
- 不改变认证机制

---

## 三、依赖关系分析

### 3.1 内部依赖图

```
@videofly/nextjs (主应用)
├── @videofly/api (tRPC)
│   ├── @videofly/auth
│   │   ├── @videofly/common
│   │   │   ├── @videofly/db
│   │   │   └── @videofly/ui
│   │   └── @videofly/db
│   ├── @videofly/db
│   └── @videofly/stripe
│       └── @videofly/db
├── @videofly/auth
├── @videofly/common
├── @videofly/db
├── @videofly/stripe
├── @videofly/video-generator
│   └── @videofly/ui
└── @videofly/ui
```

### 3.2 包迁移策略

| 包名 | 迁移策略 | 目标位置 | 优先级 |
|------|---------|---------|--------|
| @videofly/db | 迁移到 src/db/ | src/db/ | P0 |
| @videofly/common | 拆分到 services/ + ai/ + lib/ | src/services/, src/ai/, src/lib/ | P0 |
| @videofly/auth | 迁移到 src/lib/auth/ | src/lib/auth/ | P0 |
| @videofly/ui | 迁移到 src/components/ui/ | src/components/ui/ | P0 |
| @videofly/video-generator | 迁移到 src/components/video-generator/ | src/components/video-generator/ | P1 |
| @videofly/stripe | 迁移到 src/lib/stripe/ | src/lib/stripe/ | P1 |
| @videofly/api | 部分迁移到 app/api/ | app/api/ | P2 |
| @videofly/auth-proxy | 保留独立 (可选) | - | P3 |
| tooling/* | 配置合并到根目录 | 根目录 | P1 |

---

## 四、详细迁移计划

### 阶段一：准备工作 (1-2 天)

#### 1.1 环境准备

- [ ] 创建新分支 `migration/single-repo`
- [ ] 备份当前数据库 schema
- [ ] 备份环境变量配置
- [ ] 记录当前 API 端点列表

#### 1.2 依赖清单

- [ ] 列出所有外部依赖及版本
- [ ] 识别可移除的依赖
- [ ] 确认版本兼容性

#### 1.3 测试准备

- [ ] 准备测试数据
- [ ] 记录关键功能测试步骤
- [ ] 设置测试环境变量

---

### 阶段二：数据库层迁移 (1 天)

#### 2.1 迁移 @videofly/db

**源位置**: `packages/db/`
**目标位置**: `src/db/`

**迁移内容**:
```typescript
src/db/
├── schema/              # Drizzle/Kysely schema 定义
│   ├── index.ts
│   ├── videos.ts
│   ├── credits.ts
│   ├── users.ts
│   └── enums.ts
├── migrations/          # 数据库迁移文件
├── index.ts            # 数据库实例导出
└── types.ts            # TypeScript 类型定义
```

**步骤**:
1. [ ] 创建 `src/db/` 目录
2. [ ] 迁移 schema 定义 (从 Kysely 适配到 Drizzle，或保持 Kysely)
3. [ ] 迁移类型定义
4. [ ] 更新导入路径: `@videofly/db` → `@/db`
5. [ ] 配置 TypeScript 路径别名

**决策点**: Kysely vs Drizzle ORM

| 对比项 | Kysely | Drizzle |
|--------|--------|---------|
| 类型安全 | 优秀 | 优秀 |
| 性能 | 高 | 高 |
| 学习曲线 | 中等 | 较低 |
| 迁移成本 | 无 | 需重写 schema |
| 参考项目 | - | mksaas, sora2app |

**建议**: 保持 Kysely，减少迁移风险

---

### 阶段三：核心业务逻辑迁移 (2-3 天)

#### 3.1 迁移 @videofly/common

**源位置**: `packages/common/`
**目标位置**: `src/services/`, `src/ai/`, `src/lib/`

**迁移内容**:

```
src/
├── services/              # 业务逻辑服务
│   ├── credit.ts         # 积分服务 (来自 @videofly/common/services/credit.ts)
│   ├── video.ts          # 视频服务 (来自 @videofly/common/services/video.ts)
│   └── storage.ts        # 存储服务 (来自 @videofly/common/storage.ts)
│
├── ai/                    # AI 提供商抽象
│   ├── index.ts          # 提供商工厂
│   ├── types.ts          # AI 类型定义
│   ├── providers/
│   │   ├── evolink.ts   # evolink.ai 实现
│   │   └── kie.ts       # kie.ai 实现
│   └── utils/
│       └── callback-signature.ts
│
├── lib/                   # 工具函数
│   ├── storage.ts        # R2/S3 存储 (来自 @videofly/common)
│   └── utils.ts          # 通用工具
│
└── config/                # 配置文件
    ├── credits.ts        # 积分配置
    ├── models.ts         # AI 模型配置
    └── site.ts           # 站点配置
```

**步骤**:
1. [ ] 创建 `src/services/` 目录
2. [ ] 迁移积分服务
3. [ ] 迁移视频服务
4. [ ] 迁移存储服务
5. [ ] 创建 `src/ai/` 目录
6. [ ] 迁移 AI 提供商抽象层
7. [ ] 迁移配置文件
8. [ ] 更新所有导入路径

**关键注意事项**:
- 积分系统的 FIFO 逻辑必须保持一致
- 视频生成的事务逻辑不能破坏
- AI 提供商的回调签名保持不变

---

### 阶段四：认证层迁移 (1 天)

#### 4.1 迁移 @videofly/auth

**源位置**: `packages/auth/`
**目标位置**: `src/lib/auth/`

**迁移内容**:
```typescript
src/lib/auth/
├── index.ts       # 服务端导出
├── client.ts      # 客户端导出
├── server.ts      # Better Auth 服务端配置
└── utils.ts       # 认证工具函数
```

**导出 API 保持**:
```typescript
// 服务端
export { auth, type Session, type User }
export { getCurrentUser }
export { requireAuth }
export { requireAdmin }

// 客户端
export { authClient }
```

**步骤**:
1. [ ] 创建 `src/lib/auth/` 目录
2. [ ] 迁移服务端认证代码
3. [ ] 迁移客户端认证代码
4. [ ] 更新 `app/api/auth/[...all]/route.ts`
5. [ ] 更新所有导入路径: `@videofly/auth` → `@/lib/auth`

---

### 阶段五：UI 组件迁移 (1-2 天)

#### 5.1 迁移 @videofly/ui

**源位置**: `packages/ui/`
**目标位置**: `src/components/ui/`

**迁移内容**:
```
src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── input.tsx
├── select.tsx
├── toast.tsx
├── ...
└── index.ts        # 统一导出
```

**步骤**:
1. [ ] 创建 `src/components/ui/` 目录
2. [ ] 迁移所有 UI 组件
3. [ ] 更新 `tailwind.config.ts`
4. [ ] 更新 `components.json` (shadcn/ui 配置)
5. [ ] 更新所有导入路径: `@videofly/ui` → `@/components/ui`

**注意事项**:
- 保持组件导出结构一致
- 确保 Tailwind 类名正常工作
- 测试关键组件功能

---

#### 5.2 迁移 @videofly/video-generator

**源位置**: `packages/video-generator/`
**目标位置**: `src/components/video-generator/`

**迁移内容**:
```
src/components/video-generator/
├── video-generator-input.tsx
├── types.ts
├── defaults.ts
└── index.ts
```

**步骤**:
1. [ ] 创建 `src/components/video-generator/` 目录
2. [ ] 迁移主组件
3. [ ] 迁移类型定义
4. [ ] 迁移默认配置
5. [ ] 更新导入路径

---

### 阶段六：支付集成迁移 (0.5 天)

#### 6.1 迁移 @videofly/stripe

**源位置**: `packages/stripe/`
**目标位置**: `src/lib/stripe/`

**迁移内容**:
```typescript
src/lib/stripe/
├── index.ts      # Stripe 实例
├── plans.ts      # 订阅计划
├── webhooks.ts   # Webhook 处理
└── utils.ts      # 工具函数
```

**步骤**:
1. [ ] 创建 `src/lib/stripe/` 目录
2. [ ] 迁移 Stripe 配置
3. [ ] 迁移计划定义
4. [ ] 迁移 webhook 处理
5. [ ] 更新 `app/api/webhooks/stripe/`
6. [ ] 更新导入路径

---

### 阶段七：API 层处理 (1 天)

#### 7.1 处理 @videofly/api (tRPC)

**决策**: 保留 tRPC 用于遗留功能，新功能使用 Server Actions/REST API

**迁移内容**:
```
src/
├── trpc/              # tRPC 配置 (保留)
│   ├── server.ts
│   ├── client.ts
│   └── router.ts
│
└── app/api/          # REST API (已有)
    ├── v1/           # 新 REST API
    └── trpc/         # tRPC 端点 (保留)
```

**步骤**:
1. [ ] 合并 tRPC 配置到 `src/trpc/`
2. [ ] 更新 tRPC 路由导入
3. [ ] 保留现有的 `/api/v1/` REST API
4. [ ] 标记 tRPC 端点为 legacy

---

### 阶段八：工具配置合并 (0.5 天)

#### 8.1 合并 tooling 包

**迁移内容**:

| 工具包 | 合并到 |
|--------|--------|
| @videofly/eslint-config | `eslint.config.mjs` |
| @videofly/prettier-config | `.prettierrc` |
| @videofly/tailwind-config | `tailwind.config.ts` |
| @videofly/typescript-config | `tsconfig.json` |

**步骤**:
1. [ ] 合并 ESLint 配置
2. [ ] 合并 Prettier 配置
3. [ ] 合并 Tailwind 配置
4. [ ] 合并 TypeScript 配置
5. [ ] 移除 workspace 依赖

---

### 阶段九：Next.js 配置更新 (0.5 天)

#### 9.1 更新配置文件

**更新的文件**:
```
videofly/
├── package.json          # 合并所有依赖
├── tsconfig.json         # 更新路径别名
├── next.config.ts        # Next.js 配置
├── tailwind.config.ts    # Tailwind 配置
├── eslint.config.mjs     # ESLint 配置
└── .env.example          # 环境变量示例
```

**TypeScript 路径别名**:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/services/*": ["./src/services/*"],
      "@/db/*": ["./src/db/*"],
      "@/ai/*": ["./src/ai/*"],
      "@/config/*": ["./src/config/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

**步骤**:
1. [ ] 更新 `package.json` (合并所有依赖)
2. [ ] 更新 `tsconfig.json`
3. [ ] 更新 `next.config.ts`
4. [ ] 移除 `turbo.json`
5. [ ] 移除 `pnpm-workspace.yaml`
6. [ ] 更新 `.gitignore`

---

### 阶段十：应用代码更新 (2-3 天)

#### 10.1 更新导入路径

**全局替换规则**:

| 旧路径 | 新路径 |
|--------|--------|
| `@videofly/db` | `@/db` |
| `@videofly/common` | `@/services` 或具体模块 |
| `@videofly/auth` | `@/lib/auth` |
| `@videofly/ui` | `@/components/ui` |
| `@videofly/stripe` | `@/lib/stripe` |
| `@videofly/video-generator` | `@/components/video-generator` |
| `@videofly/api` | `@/trpc` 或具体位置 |

**步骤**:
1. [ ] 更新 `src/app/` 下的所有导入
2. [ ] 更新 `src/components/` 下的所有导入
3. [ ] 更新 `src/lib/` 下的所有导入
4. [ ] 全局搜索并替换

---

### 阶段十一：测试与验证 (2-3 天)

#### 11.1 功能测试

**测试清单**:

| 功能模块 | 测试点 | 状态 |
|---------|--------|------|
| 用户认证 | 登录/注册/登出 | ⬜ |
| 视频生成 | 创建任务/轮询状态 | ⬜ |
| 积分系统 | 消费/充值/过期 | ⬜ |
| 视频列表 | 分页/筛选/删除 | ⬜ |
| AI 回调 | webhook 处理 | ⬜ |
| 支付流程 | Stripe 结账 | ⬜ |
| 国际化 | 语言切换 | ⬜ |
| UI 组件 | 样式/交互 | ⬜ |

**步骤**:
1. [ ] 本地开发环境测试
2. [ ] 单元测试 (如果有)
3. [ ] 集成测试
4. [ ] E2E 测试
5. [ ] 性能测试

---

#### 11.2 构建测试

```bash
# 清理构建
rm -rf .next

# 类型检查
pnpm typecheck

# 构建
pnpm build

# 启动生产环境
pnpm start
```

**步骤**:
1. [ ] 运行类型检查
2. [ ] 执行生产构建
3. [ ] 测试生产环境
4. [ ] 检查构建输出

---

### 阶段十二：部署准备 (1 天)

#### 12.1 环境变量

**检查清单**:
```bash
# 数据库
DATABASE_URL=...

# 认证
BETTER_AUTH_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# 存储
STORAGE_ENDPOINT=...
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_BUCKET=...

# AI 提供商
EVOLINK_API_KEY=...
KIE_API_KEY=...
AI_CALLBACK_URL=...
AI_CALLBACK_SECRET=...

# 支付
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
CREEM_API_KEY=...
```

**步骤**:
1. [ ] 更新 `.env.example`
2. [ ] 验证所有环境变量
3. [ ] 配置生产环境变量

---

#### 12.2 部署配置

**Vercel 配置**:
```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install"
}
```

**步骤**:
1. [ ] 更新 `vercel.json`
2. [ ] 更新 Dockerfile (如果有)
3. [ ] 测试部署流程

---

### 阶段十三：文档更新 (0.5 天)

#### 13.1 更新项目文档

**需要更新的文档**:
- [ ] README.md
- [ ] CONTRIBUTING.md
- [ ] docs/ 目录下的文档
- [ ] API 文档
- [ ] 部署文档

---

## 五、风险评估

### 5.1 高风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据库操作破坏数据 | 高 | 完整备份 + 测试环境验证 |
| 积分系统逻辑错误 | 高 | 单元测试 + 对账验证 |
| AI 回调处理失败 | 高 | Mock 测试 + 日志监控 |
| 环境变量配置错误 | 中 | 检查清单 + 多环境验证 |

### 5.2 回滚计划

1. **保留原分支**: 在新分支上操作，原分支保持可用
2. **数据库备份**: 迁移前完整备份
3. **快速回滚**: Git revert 到迁移前
4. **增量部署**: 先部署测试环境，再部署生产

---

## 六、时间估算

| 阶段 | 预估时间 | 缓冲时间 | 总计 |
|------|---------|---------|------|
| 准备工作 | 1-2 天 | 1 天 | 2-3 天 |
| 数据库层迁移 | 1 天 | 0.5 天 | 1.5 天 |
| 核心业务逻辑迁移 | 2-3 天 | 1 天 | 3-4 天 |
| 认证层迁移 | 1 天 | 0.5 天 | 1.5 天 |
| UI 组件迁移 | 1-2 天 | 1 天 | 2-3 天 |
| 支付集成迁移 | 0.5 天 | 0.5 天 | 1 天 |
| API 层处理 | 1 天 | 0.5 天 | 1.5 天 |
| 工具配置合并 | 0.5 天 | 0.5 天 | 1 天 |
| 配置更新 | 0.5 天 | 0.5 天 | 1 天 |
| 应用代码更新 | 2-3 天 | 1 天 | 3-4 天 |
| 测试与验证 | 2-3 天 | 1 天 | 3-4 天 |
| 部署准备 | 1 天 | 0.5 天 | 1.5 天 |
| 文档更新 | 0.5 天 | 0.5 天 | 1 天 |
| **总计** | **14-20 天** | **9 天** | **23-29 天** |

---

## 七、成功标准

### 7.1 功能完整性
- [ ] 所有现有功能正常工作
- [ ] 用户认证流程正常
- [ ] 视频生成流程正常
- [ ] 积分系统正常
- [ ] 支付流程正常

### 7.2 性能指标
- [ ] 构建时间减少 > 30%
- [ ] 本地开发启动时间减少 > 20%
- [ ] 首屏加载时间保持或改善

### 7.3 代码质量
- [ ] TypeScript 类型检查无错误
- [ ] ESLint 检查无错误
- [ ] 代码覆盖率不降低

---

## 八、参考资源

### 8.1 参考项目
- [mksaas-template](../mksaas-template) - 完善的 Next.js 单应用模板
- [sora2app-video](../sora2app-video) - 功能丰富的视频生成单应用

### 8.2 官方文档
- [Next.js Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js 15 Best Practices](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji)
- [Modern Full Stack with Next.js 15](https://softwaremill.com/modern-full-stack-application-architecture-using-next-js-15/)

---

## 九、附录

### 附录 A: 完整目录结构对比

#### 迁移前 (Monorepo)
```
videofly/
├── apps/
│   ├── nextjs/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   └── trpc/
│   │   └── package.json
│   └── auth-proxy/
├── packages/
│   ├── api/
│   ├── auth/
│   ├── common/
│   ├── db/
│   ├── stripe/
│   ├── ui/
│   └── video-generator/
├── tooling/
│   ├── eslint-config/
│   ├── prettier-config/
│   ├── tailwind-config/
│   └── typescript-config/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

#### 迁移后 (Single App)
```
videofly/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # 国际化路由
│   │   └── api/               # API 路由
│   │       ├── auth/
│   │       ├── v1/
│   │       ├── trpc/
│   │       └── webhooks/
│   │
│   ├── components/            # React 组件
│   │   ├── ui/               # 基础 UI 组件 (来自 @videofly/ui)
│   │   ├── video-generator/  # 视频生成器 (来自 @videofly/video-generator)
│   │   ├── dashboard/
│   │   ├── auth/
│   │   └── ...
│   │
│   ├── db/                    # 数据库层 (来自 @videofly/db)
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── index.ts
│   │
│   ├── services/              # 业务逻辑 (来自 @videofly/common)
│   │   ├── credit.ts
│   │   ├── video.ts
│   │   └── storage.ts
│   │
│   ├── ai/                    # AI 提供商 (来自 @videofly/common/ai)
│   │   ├── index.ts
│   │   ├── providers/
│   │   └── types.ts
│   │
│   ├── lib/                   # 工具库
│   │   ├── auth/             # 认证 (来自 @videofly/auth)
│   │   ├── stripe/           # Stripe (来自 @videofly/stripe)
│   │   ├── storage.ts
│   │   └── utils.ts
│   │
│   ├── trpc/                  # tRPC 配置 (来自 @videofly/api)
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── router.ts
│   │
│   ├── config/                # 配置 (来自 @videofly/common/config)
│   │   ├── credits.ts
│   │   ├── models.ts
│   │   └── site.ts
│   │
│   ├── hooks/                 # React Hooks
│   ├── i18n/                  # 国际化
│   ├── types/                 # TypeScript 类型
│   └── actions/               # Server Actions
│
├── public/                    # 静态资源
├── messages/                  # 翻译文件
├── scripts/                   # 工具脚本
├── docs/                      # 文档
│
├── .env.example              # 环境变量示例
├── package.json              # 合并的依赖
├── tsconfig.json             # 更新的路径别名
├── next.config.ts            # Next.js 配置
├── tailwind.config.ts        # Tailwind 配置
├── eslint.config.mjs         # ESLint 配置
└── README.md                 # 项目文档
```

---

### 附录 B: 导入路径替换脚本

```bash
#!/bin/bash
# migrate-imports.sh

# 替换所有导入路径
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec sed -i '' \
  -e "s|@videofly/db|@/db|g" \
  -e "s|from '@videofly/common'|from '@/services'|g" \
  -e "s|from '@videofly/common/ai'|from '@/ai'|g" \
  -e "s|from '@videofly/common/config|from '@/config|g" \
  -e "s|from '@videofly/common/services|from '@/services|g" \
  -e "s|from '@videofly/common/storage|from '@/lib/storage|g" \
  -e "s|from '@videofly/auth'|from '@/lib/auth'|g" \
  -e "s|from '@videofly/ui'|from '@/components/ui'|g" \
  -e "s|from '@videofly/stripe'|from '@/lib/stripe'|g" \
  -e "s|from '@videofly/video-generator'|from '@/components/video-generator'|g" \
  -e "s|from '@videofly/api'|from '@/trpc'|g" \
  {} +
```

---

### 附录 C: 验证清单

#### 迁移前验证
- [ ] 数据库已备份
- [ ] 环境变量已记录
- [ ] 当前功能测试通过
- [ ] 分支已创建

#### 迁移中验证
- [ ] 每个阶段完成后类型检查通过
- [ ] 每个阶段完成后本地开发服务器正常启动
- [ ] 每个阶段完成后相关功能测试通过

#### 迁移后验证
- [ ] 所有功能测试通过
- [ ] 生产构建成功
- [ ] 性能指标达标
- [ ] 文档已更新

---

## 十、审批

| 角色 | 姓名 | 签名 | 日期 |
|------|------|------|------|
| 项目负责人 | | | |
| 技术负责人 | | | |
| 开发团队 | | | |

---

**文档结束**
