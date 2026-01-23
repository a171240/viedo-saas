# VideoFly 单应用技术架构文档

## 文档信息
- **版本**: 1.0
- **创建日期**: 2025-01-16
- **基于**: Next.js 15 + React 19

---

## 一、技术栈总览

### 1.1 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.x | 全栈框架 |
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| PostgreSQL | - | 主数据库 |
| Kysely | 0.27.x | 查询构建器 |
| Tailwind CSS | 3.x | 样式框架 |
| shadcn/ui | latest | UI 组件库 |

### 1.2 主要服务集成

| 服务 | 用途 |
|------|------|
| Better Auth | 用户认证 |
| Cloudflare R2 | 视频存储 |
| evolink.ai | 图片转视频 AI |
| kie.ai | 文本转视频 AI |
| Stripe | 支付处理 |
| Resend | 邮件发送 |

---

## 二、目录结构设计

### 2.1 完整目录树

```
videofly/
├── src/
│   │
│   ├── app/                                    # Next.js App Router
│   │   ├── [locale]/                          # 国际化路由
│   │   │   │
│   │   │   ├── (marketing)/                   # 营销页面 (公开)
│   │   │   │   ├── page.tsx                  # 首页
│   │   │   │   ├── demo/                     # 演示页面
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── pricing/                  # 定价页面
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── (dashboard)/                  # 仪表盘 (需认证)
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── page.tsx             # 仪表盘首页
│   │   │   │   │   ├── videos/              # 视频管理
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── billing/             # 账单管理
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── settings/            # 设置
│   │   │   │   │       └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   ├── (auth)/                       # 认证页面
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── layout.tsx
│   │   │   │
│   │   │   └── layout.tsx                    # 根布局
│   │   │
│   │   ├── api/                              # API 路由
│   │   │   ├── auth/[...all]/               # Better Auth 端点
│   │   │   │   └── route.ts
│   │   │   │
│   │   │   ├── v1/                          # REST API v1
│   │   │   │   ├── user/
│   │   │   │   │   └── me/route.ts
│   │   │   │   ├── credit/
│   │   │   │   │   ├── balance/route.ts
│   │   │   │   │   └── history/route.ts
│   │   │   │   ├── video/
│   │   │   │   │   ├── generate/route.ts
│   │   │   │   │   ├── list/route.ts
│   │   │   │   │   ├── [uuid]/route.ts
│   │   │   │   │   ├── [uuid]/status/route.ts
│   │   │   │   │   └── callback/[provider]/route.ts
│   │   │   │   ├── upload/
│   │   │   │   │   └── presign/route.ts
│   │   │   │   └── config/
│   │   │   │       └── models/route.ts
│   │   │   │
│   │   │   ├── trpc/                        # tRPC 端点 (遗留)
│   │   │   │   └── [...trpc]/route.ts
│   │   │   │
│   │   │   └── webhooks/
│   │   │       ├── stripe/route.ts
│   │   │       └── creem/route.ts
│   │   │
│   │   ├── layout.tsx                        # 根布局
│   │   └── globals.css                       # 全局样式
│   │
│   │
│   ├── components/                           # React 组件
│   │   ├── ui/                              # 基础 UI 组件 (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── form.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   │
│   │   ├── video-generator/                 # 视频生成器组件
│   │   │   ├── video-generator-input.tsx
│   │   │   ├── model-selector.tsx
│   │   │   ├── image-upload.tsx
│   │   │   ├── video-preview.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── dashboard/                       # 仪表盘组件
│   │   │   ├── video-list.tsx
│   │   │   ├── video-card.tsx
│   │   │   ├── credit-display.tsx
│   │   │   └── stats-card.tsx
│   │   │
│   │   ├── auth/                            # 认证组件
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── auth-header.tsx
│   │   │
│   │   ├── marketing/                       # 营销页面组件
│   │   │   ├── hero.tsx
│   │   │   ├── features.tsx
│   │   │   ├── pricing-card.tsx
│   │   │   └── footer.tsx
│   │   │
│   │   └── shared/                          # 共享组件
│   │       ├── header.tsx
│   │       ├── sidebar.tsx
│   │       ├── loading.tsx
│   │       └── error-boundary.tsx
│   │
│   │
│   ├── db/                                   # 数据库层
│   │   ├── schema/                          # Schema 定义
│   │   │   ├── index.ts                    # Schema 导出
│   │   │   ├── users.ts                    # 用户表
│   │   │   ├── sessions.ts                 # 会话表
│   │   │   ├── videos.ts                   # 视频表
│   │   │   ├── credits.ts                  # 积分相关表
│   │   │   │   ├── credit-packages.ts
│   │   │   │   ├── credit-holds.ts
│   │   │   │   └── credit-transactions.ts
│   │   │   ├── payments.ts                 # 支付表
│   │   │   │   └── subscriptions.ts
│   │   │   └── enums.ts                    # 枚举定义
│   │   │
│   │   ├── migrations/                      # 数据库迁移
│   │   │   └── ...
│   │   │
│   │   ├── index.ts                         # 数据库实例导出
│   │   └── types.ts                         # TypeScript 类型
│   │
│   │
│   ├── services/                             # 业务逻辑服务
│   │   ├── credit.ts                        # 积分服务
│   │   │   # 功能:
│   │   │   # - getBalance(userId)
│   │   │   # - freeze({ userId, credits, videoUuid })
│   │   │   # - settle(holdId, actualCredits)
│   │   │   # - release(holdId)
│   │   │   # - recharge({ userId, credits, orderNo })
│   │   │
│   │   ├── video.ts                         # 视频服务
│   │   │   # 功能:
│   │   │   # - generate(params)
│   │   │   # - handleCallback(provider, payload)
│   │   │   # - refreshStatus(uuid, userId)
│   │   │   # - listVideos(userId, options)
│   │   │   # - deleteVideo(uuid, userId)
│   │   │
│   │   ├── storage.ts                       # 存储服务
│   │   │   # 功能:
│   │   │   # - getPresignedUploadUrl(filename)
│   │   │   # - uploadFile(file, key)
│   │   │   # - downloadFromUrl(url)
│   │   │   # - getPublicUrl(key)
│   │   │
│   │   └── email.ts                         # 邮件服务
│   │
│   │
│   ├── ai/                                   # AI 提供商抽象
│   │   ├── index.ts                         # 提供商工厂
│   │   │   # export function getProvider(type: ProviderType)
│   │   │
│   │   ├── types.ts                         # AI 类型定义
│   │   │   # interface VideoProvider
│   │   │   # interface CreateTaskOptions
│   │   │   # interface TaskResult
│   │   │
│   │   ├── providers/                       # 提供商实现
│   │   │   ├── evolink.ts                  # evolink.ai
│   │   │   │   # class EvolinkProvider implements VideoProvider
│   │   │   │
│   │   │   └── kie.ts                      # kie.ai
│   │   │       # class KieProvider implements VideoProvider
│   │   │
│   │   └── utils/
│   │       └── callback-signature.ts       # 回调签名验证
│   │
│   │
│   ├── lib/                                  # 工具库
│   │   ├── auth/                            # 认证库
│   │   │   ├── index.ts                    # 服务端导出
│   │   │   │   # export { auth, getCurrentUser, requireAuth, requireAdmin }
│   │   │   ├── client.ts                   # 客户端导出
│   │   │   │   # export { authClient }
│   │   │   ├── server.ts                   # Better Auth 配置
│   │   │   └── utils.ts                    # 认证工具
│   │   │
│   │   ├── stripe/                          # Stripe 集成
│   │   │   ├── index.ts                    # Stripe 实例
│   │   │   ├── plans.ts                    # 订阅计划
│   │   │   ├── webhooks.ts                 # Webhook 处理
│   │   │   └── utils.ts                    # Stripe 工具
│   │   │
│   │   ├── storage.ts                       # R2/S3 存储
│   │   ├── utils.ts                         # 通用工具函数
│   │   └── constants.ts                     # 常量定义
│   │
│   │
│   ├── trpc/                                 # tRPC 配置 (遗留)
│   │   ├── server.ts                        # 服务端配置
│   │   ├── client.ts                        # 客户端配置
│   │   ├── router.ts                        # 路由定义
│   │   └── routers/
│   │       ├── auth.ts
│   │       ├── customer.ts
│   │       ├── stripe.ts
│   │       └── k8s.ts
│   │
│   │
│   ├── config/                               # 应用配置
│   │   ├── credits.ts                       # 积分配置
│   │   │   # export const CREDIT_NEW_USER_AMOUNT = 100
│   │   │   # export const CREDIT_PACKAGES = [...]
│   │   │
│   │   ├── models.ts                        # AI 模型配置
│   │   │   # export const AI_MODELS = [...]
│   │   │   # export const getModelById(id)
│   │   │
│   │   ├── site.ts                          # 站点配置
│   │   │   # export const siteConfig = { ... }
│   │   │
│   │   └── features.ts                      # 功能开关
│   │
│   │
│   ├── hooks/                                # React Hooks
│   │   ├── use-auth.ts
│   │   ├── use-credits.ts
│   │   ├── use-videos.ts
│   │   ├── use-video-generation.ts
│   │   └── use-debounce.ts
│   │
│   │
│   ├── i18n/                                 # 国际化
│   │   ├── request.ts                       # next-intl 配置
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   └── zh.json
│   │   └── middleware.ts                    # i18n 中间件
│   │
│   │
│   ├── types/                                # TypeScript 类型
│   │   ├── index.ts
│   │   ├── video.ts
│   │   ├── credit.ts
│   │   └── api.ts
│   │
│   │
│   ├── actions/                              # Server Actions
│   │   ├── auth.ts
│   │   ├── credits.ts
│   │   ├── videos.ts
│   │   └── payments.ts
│   │
│   │
│   └── styles/                               # 样式文件
│       └── globals.css
│
│
├── public/                                   # 静态资源
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── messages/                                 # 翻译文件
│   ├── en.json
│   └── zh.json
│
├── scripts/                                  # 工具脚本
│   ├── db/
│   │   ├── migrate.ts
│   │   └── seed.ts
│   └── utils/
│
├── docs/                                     # 文档
│   ├── MIGRATION_PLAN.md
│   ├── TECHNICAL_ARCHITECTURE.md
│   └── API.md
│
├── .env.example                              # 环境变量示例
├── .gitignore
├── .prettierrc
├── biome.json                                # Biome 配置
├── drizzle.config.ts                         # Drizzle 配置
├── next.config.ts                            # Next.js 配置
├── package.json                              # 依赖管理
├── tsconfig.json                             # TypeScript 配置
└── tailwind.config.ts                        # Tailwind 配置
```

---

## 三、核心模块详解

### 3.1 数据库层 (src/db/)

#### 设计模式
- **ORM**: Kysely (类型安全的查询构建器)
- **Migration**: 自定义迁移脚本
- **类型生成**: 从 Kysely 类型生成

#### 核心表结构

```typescript
// 视频表
interface Video {
  id: number
  uuid: string
  userId: number
  prompt: string
  model: string
  provider: 'evolink' | 'kie'
  status: VideoStatus
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: number
  aspectRatio: string
  parameters: Json
  creditsUsed: number
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
}

enum VideoStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 积分包表
interface CreditPackage {
  id: number
  userId: number
  orderNo: string | null
  credits: number
  usedCredits: number
  frozenCredits: number
  remainingCredits: number
  transType: CreditTransType
  expiresAt: Date | null
  status: CreditPackageStatus
  createdAt: Date
  updatedAt: Date
}

// 积分冻结表
interface CreditHold {
  id: number
  userId: number
  videoUuid: string
  credits: number
  packageAllocation: Json  // { packageId: credits }
  status: 'active' | 'released' | 'settled'
  createdAt: Date
  updatedAt: Date
}

// 积分交易表
interface CreditTransaction {
  id: number
  userId: number
  credits: number
  balanceAfter: number
  transType: CreditTransType
  videoUuid: string | null
  remark: string | null
  createdAt: Date
}
```

#### 导出 API

```typescript
// src/db/index.ts
export { db } from './instance'
export * from './types'
export * from './schema'
export * from './enums'
```

---

### 3.2 积分系统 (src/services/credit.ts)

#### 设计模式
- **FIFO 消费**: 最早过期的积分包先消耗
- **冻结机制**: 生成时冻结，成功后结算，失败后释放
- **事务安全**: 使用数据库事务确保一致性

#### 核心流程

```
1. 冻结积分 (Freeze)
   用户请求生成 → 计算所需积分 → 冻结积分包 → 创建冻结记录

2. 结算积分 (Settle)
   AI 返回成功 → 确认实际消耗 → 更新积分包 → 释放冻结 → 记录交易

3. 释放积分 (Release)
   AI 返回失败 → 释放冻结积分 → 回退积分包 → 记录交易
```

#### API 设计

```typescript
interface CreditService {
  // 查询余额
  getBalance(userId: number): Promise<{
    available: number
    frozen: number
    used: number
  }>

  // 冻结积分
  freeze(options: {
    userId: number
    credits: number
    videoUuid: string
  }): Promise<string>  // 返回 holdId

  // 结算积分
  settle(holdId: string, actualCredits: number): Promise<void>

  // 释放积分
  release(holdId: string): Promise<void>

  // 充值积分
  recharge(options: {
    userId: number
    credits: number
    orderNo?: string
    transType: CreditTransType
  }): Promise<void>

  // 获取交易历史
  getTransactions(userId: number, options?: {
    limit?: number
    offset?: number
  }): Promise<CreditTransaction[]>
}
```

---

### 3.3 视频服务 (src/services/video.ts)

#### 设计模式
- **异步生成**: 调用 AI API 后立即返回任务 ID
- **轮询 + 回调**: 支持前端轮询和 AI 回调两种方式
- **幂等性**: 使用 videoUuid 确保操作幂等

#### 核心流程

```
视频生成流程:
1. 用户提交 prompt 和参数
2. 验证积分余额
3. 冻结所需积分
4. 创建视频记录 (status: pending)
5. 调用 AI 提供商 API
6. 更新状态为 generating
7. 返回 videoUuid 给前端

AI 回调处理:
1. 接收 AI 回调
2. 验证签名
3. 下载视频到临时目录
4. 上传视频到 R2
5. 更新视频记录
6. 结算积分
7. 返回成功
```

#### API 设计

```typescript
interface VideoService {
  // 生成视频
  generate(options: {
    userId: number
    prompt: string
    model: string
    provider: string
    image?: string
    duration?: number
    aspectRatio?: string
  }): Promise<{
    uuid: string
    status: VideoStatus
    creditsUsed: number
  }>

  // 处理 AI 回调
  handleCallback(provider: string, payload: unknown): Promise<void>

  // 刷新状态 (前端轮询)
  refreshStatus(uuid: string, userId: number): Promise<{
    status: VideoStatus
    videoUrl?: string
    progress?: number
  }>

  // 列出视频
  listVideos(userId: number, options?: {
    status?: VideoStatus
    limit?: number
    offset?: number
  }): Promise<Video[]>

  // 删除视频
  deleteVideo(uuid: string, userId: number): Promise<void>

  // 获取视频详情
  getVideo(uuid: string, userId: number): Promise<Video | null>
}
```

---

### 3.4 AI 提供商抽象 (src/ai/)

#### 设计模式
- **工厂模式**: getProvider() 返回配置好的提供商实例
- **接口统一**: 所有提供商实现相同的 VideoProvider 接口
- **可扩展**: 添加新提供商只需实现接口

#### 核心接口

```typescript
// 基础接口
interface VideoProvider {
  name: string
  type: 'text-to-video' | 'image-to-video' | 'both'

  // 创建生成任务
  createTask(options: CreateTaskOptions): Promise<TaskResult>

  // 查询任务状态
  getTaskStatus(taskId: string): Promise<TaskStatus>

  // 验证回调签名
  verifyCallback(payload: unknown, signature: string): boolean
}

interface CreateTaskOptions {
  prompt: string
  image?: string  // 图片 URL (图片转视频)
  duration?: number
  aspectRatio?: string
  model?: string
  webhookUrl?: string
}

interface TaskResult {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  estimatedTime?: number  // 秒
  videoUrl?: string
}

interface TaskStatus {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number  // 0-100
  videoUrl?: string
  error?: string
}
```

#### 提供商工厂

```typescript
// src/ai/index.ts
import { EvolinkProvider } from './providers/evolink'
import { KieProvider } from './providers/kie'

const providers = {
  evolink: new EvolinkProvider({
    apiKey: process.env.EVOLINK_API_KEY!,
    webhookSecret: process.env.AI_CALLBACK_SECRET!
  }),
  kie: new KieProvider({
    apiKey: process.env.KIE_API_KEY!,
    webhookSecret: process.env.AI_CALLBACK_SECRET!
  })
}

export function getProvider(type: string): VideoProvider {
  const provider = providers[type]
  if (!provider) {
    throw new Error(`Unknown provider: ${type}`)
  }
  return provider
}

export * from './types'
```

---

### 3.5 认证系统 (src/lib/auth/)

#### 设计模式
- **Better Auth**: 使用 Better Auth 库
- **服务端/客户端分离**: 不同的导出用于不同环境
- **中间件保护**: 路由级别的认证检查

#### 配置

```typescript
// src/lib/auth/server.ts
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { db } from "@/db"

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 天
    updateAge: 60 * 60 * 24       // 每天更新
  }
})

// 服务端辅助函数
export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: headers()
  })
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== "admin") {
    throw new Error("Forbidden")
  }
  return user
}
```

```typescript
// src/lib/auth/client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!
})

export const {
  signIn,
  signUp,
  signOut,
  useSession
} = authClient
```

---

### 3.6 存储系统 (src/lib/storage.ts)

#### 设计模式
- **S3 兼容**: 使用 AWS SDK v3
- **预签名 URL**: 支持客户端直接上传
- **CDN 集成**: 返回带 CDN 域名的 URL

#### API 设计

```typescript
interface StorageService {
  // 获取预签名上传 URL
  getPresignedUploadUrl(options: {
    key: string
    contentType?: string
    expiresIn?: number
  }): Promise<string>

  // 上传文件 (服务端)
  uploadFile(options: {
    file: Buffer | Stream
    key: string
    contentType?: string
  }): Promise<string>  // 返回公网 URL

  // 下载文件
  downloadFile(key: string): Promise<Buffer>

  // 从 URL 下载并上传
  downloadAndUpload(url: string, key: string): Promise<string>

  // 删除文件
  deleteFile(key: string): Promise<void>

  // 获取公网 URL
  getPublicUrl(key: string): string

  // 批量删除
  deleteFiles(keys: string[]): Promise<void>
}
```

---

## 四、API 设计

### 4.1 REST API (推荐用于新功能)

#### 基础路径
```
/api/v1/
```

#### 端点列表

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/user/me` | 获取当前用户 | 必需 |
| GET | `/credit/balance` | 获取积分余额 | 必需 |
| GET | `/credit/history` | 获取交易历史 | 必需 |
| POST | `/video/generate` | 创建视频任务 | 必需 |
| GET | `/video/list` | 获取视频列表 | 必需 |
| GET | `/video/:uuid` | 获取视频详情 | 必需 |
| DELETE | `/video/:uuid` | 删除视频 | 必需 |
| GET | `/video/:uuid/status` | 轮询视频状态 | 必需 |
| POST | `/video/callback/:provider` | AI 回调 | 签名 |
| POST | `/upload/presign` | 获取上传 URL | 必需 |
| GET | `/config/models` | 获取模型列表 | 可选 |

#### 响应格式

```typescript
// 成功响应
{
  success: true,
  data: { ... }
}

// 错误响应
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### 4.2 Server Actions (推荐用于表单操作)

```typescript
// src/actions/videos.ts
'use server'

import { requireAuth } from '@/lib/auth'
import { videoService } from '@/services/video'

export async function generateVideo(formData: FormData) {
  const user = await requireAuth()

  const prompt = formData.get('prompt') as string
  const model = formData.get('model') as string
  // ...

  const result = await videoService.generate({
    userId: user.id,
    prompt,
    model
    // ...
  })

  return result
}
```

---

## 五、配置管理

### 5.1 环境变量

```bash
# .env.example

# 应用
NEXT_PUBLIC_APP_URL=https://videofly.com
NEXT_PUBLIC_APP_NAME=VideoFly

# 数据库
DATABASE_URL=postgresql://user:password@host:5432/videofly

# 认证
BETTER_AUTH_SECRET=your-secret-key
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# 存储 (R2/S3)
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=xxx
STORAGE_SECRET_KEY=xxx
STORAGE_BUCKET=videofly
STORAGE_DOMAIN=https://cdn.videofly.com

# AI 提供商
EVOLINK_API_KEY=xxx
KIE_API_KEY=xxx
AI_CALLBACK_URL=https://videofly.com/api/v1/video/callback
AI_CALLBACK_SECRET=xxx

# 支付
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_xxx

CREEM_API_KEY=xxx
CREEM_WEBHOOK_SECRET=xxx

# 邮件
RESEND_API_KEY=xxx

# 监控 (可选)
NEXT_PUBLIC_SENTRY_DSN=xxx
```

### 5.2 应用配置

```typescript
// src/config/credits.ts
export const CREDIT_CONFIG = {
  // 新用户奖励
  NEW_USER_AMOUNT: 100,

  // 积分包配置
  PACKAGES: [
    { id: 'starter', credits: 500, price: 9.99 },
    { id: 'pro', credits: 2000, price: 29.99 },
    { id: 'unlimited', credits: 10000, price: 99.99 }
  ],

  // 过期时间 (天)
  EXPIRY_DAYS: {
    PURCHASE: 365,
    NEW_USER: 30,
    SUBSCRIPTION: 30
  }
}

// src/config/models.ts
export const AI_MODELS = [
  {
    id: 'kie-sora-2',
    name: 'Sora 2',
    provider: 'kie',
    type: 'text-to-video',
    credits: 50,
    duration: 5,
    features: ['high-quality', 'fast']
  },
  {
    id: 'evolink-img2vid',
    name: 'Image to Video',
    provider: 'evolink',
    type: 'image-to-video',
    credits: 30,
    duration: 4,
    features: ['image-upload', 'smooth-motion']
  }
]
```

---

## 六、部署配置

### 6.1 Vercel 部署

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["hkg1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "BETTER_AUTH_SECRET": "@auth-secret"
  }
}
```

### 6.2 Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 七、性能优化

### 7.1 构建优化

```typescript
// next.config.ts
export default {
  // 启用 SWC 压缩
  swcMinify: true,

  // 实验性功能
  experimental: {
    // 优化包导入
    optimizePackageImports: [
      '@/components/ui',
      '@/lib/utils'
    ]
  },

  // 图片优化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96]
  }
}
```

### 7.2 运行时优化

- **数据库连接池**: 使用连接池减少连接开销
- **Redis 缓存**: 缓存热点数据 (用户信息、积分余额)
- **CDN**: 静态资源和视频文件使用 CDN
- **图片懒加载**: 使用 Next.js Image 组件

---

## 八、安全考虑

### 8.1 认证安全
- CSRF 保护
- 会话固定保护
- 安全的密码哈希

### 8.2 API 安全
- 速率限制
- 签名验证 (AI 回调)
- 输入验证

### 8.3 数据安全
- SQL 注入防护 (使用参数化查询)
- XSS 防护
- 环境变量保护

---

**文档结束**
