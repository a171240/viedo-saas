# Phase 1: 基础设施升级

[← 返回目录](./00-INDEX.md) | [下一阶段 →](./02-PHASE2-DATA-LAYER.md)

---

## 1.1 目标

- 升级 Next.js 14 → 15, React 18 → 19
- 建立 Next.js API Routes 基础架构
- 保留 TRPC 兼容（渐进式迁移）

## 1.2 详细任务

### 1.2.1 版本升级

**需要修改的文件**:

```
apps/nextjs/package.json          # 更新依赖版本
packages/*/package.json           # 更新各包依赖
apps/nextjs/src/trpc/server.ts    # 修复 async headers()/cookies()
```

**依赖变更**:

```json
{
  "next": "15.1.x",
  "react": "19.0.x",
  "react-dom": "19.0.x",
  "@types/react": "19.x",
  "@types/react-dom": "19.x"
}
```

**Breaking Changes 处理**:

```typescript
// Before (Next.js 14)
const h = new Map(headers());
h.set("cookie", cookies().toString());

// After (Next.js 15)
const h = new Map(await headers());
h.set("cookie", (await cookies()).toString());
```

### 1.2.2 API Routes 基础架构

**新建目录结构**:

```
apps/nextjs/src/app/api/
├── v1/                           # API 版本控制
│   ├── video/                    # 视频相关 API
│   │   ├── generate/route.ts     # POST 视频生成
│   │   ├── [uuid]/status/route.ts# GET 状态查询
│   │   ├── callback/[provider]/route.ts # POST AI 回调
│   │   ├── list/route.ts         # GET 视频列表
│   │   └── [uuid]/route.ts       # GET/DELETE 单个视频
│   ├── credit/                   # 积分相关 API
│   │   ├── balance/route.ts      # GET 积分余额
│   │   ├── history/route.ts      # GET 积分历史
│   │   └── (由视频生成流程结算)     # 消耗积分由 freeze/settle/release 管理
│   ├── user/                     # 用户相关 API
│   │   └── me/route.ts           # GET 当前用户信息
│   └── config/                   # 配置相关 API
│       └── models/route.ts       # GET 模型配置
├── webhooks/
│   ├── stripe/route.ts           # 现有
│   └── creem/route.ts            # 可选（默认由 Better Auth 处理 /api/auth/creem/webhook）
└── _lib/                         # API 工具库
    ├── auth.ts                   # 认证中间件
    ├── response.ts               # 统一响应格式
    └── error.ts                  # 错误处理
```

**API 工具库实现**:

```typescript
// apps/nextjs/src/app/api/_lib/auth.ts
import { auth } from "@videofly/auth";

export async function getAuthUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return null;
  }

  return session.user;
}

export async function requireAuth(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    throw new ApiError("Unauthorized", 401);
  }
  return user;
}

// apps/nextjs/src/app/api/_lib/response.ts
export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return Response.json({
    success: false,
    error: { message, details }
  }, { status });
}

// apps/nextjs/src/app/api/_lib/error.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return apiError(error.message, error.status, error.details);
  }
  console.error("Unexpected error:", error);
  return apiError("Internal server error", 500);
}
```

## 1.3 验收标准

- [ ] Next.js 15 开发服务器正常启动
- [ ] 现有 TRPC API 继续工作
- [ ] 新建 `/api/v1/user/me` 返回当前用户信息
- [ ] 所有 TypeScript 类型检查通过

## 1.4 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TRPC 与 Next.js 15 兼容性 | 中 | 保持 TRPC 10.x，按需升级 |
| React 19 组件兼容性 | 低 | 项目使用函数式组件，影响小 |
| contentlayer2 兼容性 | 中 | 测试博客功能，必要时替换 |

---

[← 返回目录](./00-INDEX.md) | [下一阶段 →](./02-PHASE2-DATA-LAYER.md)
