# 附录 A: 文件清单、环境变量、依赖

[← Phase 6](./06-PHASE6-CREEM.md) | [返回目录](./00-INDEX.md) | [附录 A2 →](./A2-SUPPLEMENTARY-IMPL.md)

---

## A. 完整文件清单

### Phase 1 新建/修改文件

```text
apps/nextjs/package.json
apps/nextjs/src/trpc/server.ts
apps/nextjs/src/app/api/_lib/auth.ts
apps/nextjs/src/app/api/_lib/response.ts
apps/nextjs/src/app/api/_lib/error.ts
apps/nextjs/src/app/api/v1/user/me/route.ts
```

### Phase 2 新建/修改文件

```text
packages/db/prisma/schema.prisma
packages/common/src/storage.ts
packages/common/package.json
.env.example
```

### Phase 3 新建文件

```text
packages/common/src/config/credits.ts                     # 统一积分配置（含产品、模型、过期设置）
packages/common/src/services/credit.ts                    # 积分 Service
apps/nextjs/src/stores/credits-store.ts                   # Zustand 积分状态管理
apps/nextjs/src/hooks/use-credit-packages.ts              # i18n 积分包 hooks
apps/nextjs/src/app/api/v1/credit/balance/route.ts        # GET 积分余额
apps/nextjs/src/app/api/v1/credit/history/route.ts        # GET 积分历史
apps/nextjs/src/app/api/cron/expire-credits/route.ts      # Cron 过期积分处理
apps/nextjs/messages/en.json                              # 添加 credits 翻译
apps/nextjs/messages/zh.json                              # 添加 credits 翻译
```

### Phase 4 新建文件

```text
packages/common/src/ai/types.ts                           # 统一接口定义
packages/common/src/ai/index.ts                           # Provider 工厂
packages/common/src/ai/providers/evolink.ts               # evolink.ai 实现
packages/common/src/ai/providers/kie.ts                   # kie.ai 实现
packages/common/src/utils/callback-signature.ts           # 回调签名工具
packages/common/src/services/video.ts                     # 视频 Service
apps/nextjs/src/app/api/v1/video/generate/route.ts        # POST 视频生成
apps/nextjs/src/app/api/v1/video/callback/[provider]/route.ts  # POST AI 回调
apps/nextjs/src/app/api/v1/video/[uuid]/route.ts          # GET/DELETE 单个视频
apps/nextjs/src/app/api/v1/video/[uuid]/status/route.ts   # GET 视频状态（轮询）
apps/nextjs/src/app/api/v1/video/list/route.ts            # GET 视频列表
apps/nextjs/src/app/api/v1/config/models/route.ts         # GET 模型配置
apps/nextjs/src/app/api/v1/upload/presign/route.ts        # POST 获取预签名 URL
apps/nextjs/src/app/api/_lib/rate-limit.ts                # API 限流中间件
```

> **说明**: 模型配置已合并到 Phase 3 的 `packages/common/src/config/credits.ts`。

### Phase 5 新建/修改文件

```text
apps/nextjs/src/app/[lang]/(marketing)/demo/video-generator/page.tsx
apps/nextjs/src/app/[lang]/(dashboard)/dashboard/videos/page.tsx
apps/nextjs/src/lib/video-api.ts                          # 前端 API 调用工具
apps/nextjs/src/components/video-generator/video-status-card.tsx
apps/nextjs/src/components/video-generator/video-card.tsx
```

### Phase 6 新建/修改文件

```text
packages/auth/index.ts                                    # 添加 Creem 插件
apps/nextjs/src/lib/auth-client.ts                        # 添加 creemClient
apps/nextjs/src/app/[lang]/(marketing)/pricing/page.tsx   # 购买积分页面
apps/nextjs/src/components/subscription-manager.tsx       # 订阅管理组件
packages/db/prisma/schema.prisma                          # 添加 CreemSubscription (可选)
```

> **说明**: Creem 产品配置已合并到 Phase 3 的 `packages/common/src/config/credits.ts`。

### 配置文件

```text
apps/nextjs/vercel.json                                   # Vercel Cron 配置
```

### 附录 A2 补充文件（A2.*）

```text
# A2.1 - 预签名上传
apps/nextjs/src/app/api/v1/upload/presign/route.ts

# A2.2 - 单个视频 API
apps/nextjs/src/app/api/v1/video/[uuid]/route.ts

# A2.3 - 过期积分定时任务
apps/nextjs/src/app/api/cron/expire-credits/route.ts
apps/nextjs/vercel.json

# A2.4 - CreditHold Schema 修复
packages/db/prisma/schema.prisma

# A2.5 - Creem onGrantAccess 幂等性保护
packages/auth/index.ts

# A2.6 - VideoStatusCard 组件
apps/nextjs/src/components/video-generator/video-status-card.tsx

# A2.7 - VideoCard 组件
apps/nextjs/src/components/video-generator/video-card.tsx

# A2.8 - API 限流
apps/nextjs/src/app/api/_lib/rate-limit.ts

# A2.9 - 新增依赖
apps/nextjs/package.json
```

### 附录 A3 补充文件（A3.*）

```text
# A3.1 - Creem Webhook（可选）
apps/nextjs/src/app/api/webhooks/creem/route.ts

# A3.2 - 视频重试
apps/nextjs/src/app/api/v1/video/[uuid]/retry/route.ts

# A3.3 - 视频清理
apps/nextjs/src/app/api/cron/cleanup-videos/route.ts

# A3.4 - 错误码定义
packages/common/src/errors/video-errors.ts
```

---

## B. 环境变量完整列表

```bash
# ============================================
# Database
# ============================================
POSTGRES_URL=

# ============================================
# Auth (Better Auth)
# ============================================
BETTER_AUTH_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# ============================================
# Email
# ============================================
RESEND_API_KEY=
RESEND_FROM=

# ============================================
# Stripe (保留兼容)
# ============================================
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# ============================================
# Creem 支付 (Phase 6)
# ============================================
CREEM_API_KEY=creem_live_xxxxxxxx
CREEM_WEBHOOK_SECRET=whsec_xxxxxxxx

# 产品 ID（在 Creem 后台创建）
NEXT_PUBLIC_CREEM_PRODUCT_SUB_BASIC=prod_sub_basic
NEXT_PUBLIC_CREEM_PRODUCT_SUB_PRO=prod_sub_pro
NEXT_PUBLIC_CREEM_PRODUCT_SUB_TEAM=prod_sub_team
NEXT_PUBLIC_CREEM_PRODUCT_PACK_STARTER=prod_pack_starter
NEXT_PUBLIC_CREEM_PRODUCT_PACK_STANDARD=prod_pack_standard
NEXT_PUBLIC_CREEM_PRODUCT_PACK_PREMIUM=prod_pack_premium

# ============================================
# Storage (R2/S3)
# ============================================
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=your_bucket_name
STORAGE_DOMAIN=https://cdn.yourdomain.com

# ============================================
# AI Video Providers (Phase 4)
# ============================================
# evolink.ai - 支持图生视频
EVOLINK_API_KEY=your_evolink_api_key

# kie.ai - 仅文生视频
KIE_API_KEY=your_kie_api_key

# 默认 Provider (evolink 或 kie)
DEFAULT_AI_PROVIDER=evolink

# ============================================
# AI Callback (生产环境必须配置)
# ============================================
AI_CALLBACK_URL=https://yourdomain.com/api/v1/video/callback
CALLBACK_HMAC_SECRET=your_callback_secret

# ============================================
# Cron Job 认证
# ============================================
CRON_SECRET=your_cron_secret_key

# ============================================
# App
# ============================================
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## C. 依赖版本参考

```json
{
  "next": "15.1.x",
  "react": "19.0.x",
  "react-dom": "19.0.x",
  "@aws-sdk/client-s3": "^3.700.x",
  "@aws-sdk/s3-request-presigner": "^3.700.x",
  "@creem_io/better-auth": "latest",
  "lru-cache": "^10.x",
  "nanoid": "^5.x",
  "zod": "^3.x",
  "zustand": "^5.x"
}
```

---

[← Phase 6](./06-PHASE6-CREEM.md) | [返回目录](./00-INDEX.md) | [附录 A2 →](./A2-SUPPLEMENTARY-IMPL.md)
