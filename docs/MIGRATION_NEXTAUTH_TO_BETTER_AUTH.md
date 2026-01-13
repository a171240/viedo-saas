# NextAuth.js 到 Better Auth 迁移方案（基于当前代码仓库）

> ✅ **迁移状态：已完成** (2026-01-03)
>
> 本迁移已成功执行，包括：
> - 代码迁移（所有文件已更新）
> - 数据库迁移（Better Auth 表已创建）
> - 类型修复和测试验证

## 目录
1. [概述](#1-概述)
2. [迁移动机与收益](#2-迁移动机与收益)
3. [现状盘点](#3-现状盘点)
4. [目标架构与文件布局](#4-目标架构与文件布局)
5. [迁移步骤](#5-迁移步骤)
6. [数据库与数据迁移](#6-数据库与数据迁移)
7. [代码改动清单](#7-代码改动清单)
8. [测试计划](#8-测试计划)
9. [回滚方案](#9-回滚方案)
10. [风险与注意事项](#10-风险与注意事项)

---

## 1. 概述

### 1.1 项目现状
- 认证：NextAuth.js 4.24.7，JWT 策略，`@auth/kysely-adapter`，PostgreSQL（`@vercel/postgres-kysely`）。
- 核心入口：`packages/auth/index.ts`（`authOptions` + `auth()` + `getCurrentUser()`）。
- API：tRPC 使用 `next-auth/jwt` 取 token（`packages/api/src/trpc.ts`）；部分路由直接用 `getServerSession`（如 `packages/api/src/router/customer.ts`、`packages/api/src/router/k8s.ts`）。
- 前端：多处使用 `next-auth/react` 的 `signIn / signOut / useSession`（`apps/nextjs/src/components/user-auth-form.tsx`、`sign-in-modal.tsx`、`user-account-nav.tsx`、`user-avatar.tsx`、`app/admin/login/page.tsx` 等）。
- 中间件：`apps/nextjs/src/middleware.ts` 依赖 `withAuth` 与 `getToken` 做路由守卫。
- API Route：`apps/nextjs/src/app/api/auth/[...nextauth]/route.ts` 暴露 NextAuth handler。
- 类型扩展：`apps/nextjs/src/types/next-auth.d.ts`。

### 1.2 迁移目标
- 用 Better Auth 替换 NextAuth，保持现有功能：GitHub OAuth + Email Magic Link，保留管理员标记（`ADMIN_EMAIL`）。
- 复用现有 Kysely/PostgreSQL 连接（`@saasfly/db`）。
- 降低侵入性：尽量复用现有路径约定（API 路由、tRPC、前端组件接口）。

### 1.3 工作量预估（按当前仓库）
| 阶段 | 预估 |
| --- | --- |
| 依赖与配置落地 | 1h |
| 服务端适配（auth 配置、API route、middleware、tRPC） | 4h |
| 前端组件适配 | 3h |
| 数据库表创建与数据迁移 | 2h |
| 联调与回归 | 2h |
| **合计** | **约 12h** |

---

## 2. 迁移动机与收益
1) **类型与 DX**：Better Auth 对 Kysely 有一等支持，客户端 hooks 内置类型推断。  
2) **功能面**：内置安全特性（速率限制、魔法链路、社交登录、可扩展字段），减少自维护代码。  
3) **未来扩展**：后续可平滑引入 2FA、Bearer、Org/Team 等插件，无需重写核心。  

---

## 3. 现状盘点

### 3.1 关键文件（完整清单）

```text
packages/auth/index.ts            # NextAuth 配置、getCurrentUser
packages/auth/db.ts               # Kysely 类型定义（User/Account/Session/VerificationToken）
packages/auth/env.mjs             # NEXTAUTH_*, GitHub, Resend, Stripe, ADMIN_EMAIL
packages/api/src/trpc.ts          # 基于 next-auth/jwt 解析 token
packages/api/src/router/customer.ts / k8s.ts  # 直接调用 getServerSession
apps/nextjs/src/app/api/auth/[...nextauth]/route.ts  # NextAuth handler
apps/nextjs/src/middleware.ts     # withAuth + getToken 路由守卫
apps/nextjs/src/types/next-auth.d.ts          # 类型扩展
apps/nextjs/src/env.mjs                       # 引用 NEXTAUTH 变量
apps/nextjs/src/components/user-auth-form.tsx # Email / GitHub 登录
apps/nextjs/src/components/sign-in-modal.tsx  # GitHub 登录
apps/nextjs/src/components/navbar.tsx         # 可能使用 session
apps/nextjs/src/components/user-name-form.tsx # 使用 next-auth
apps/nextjs/src/components/user-account-nav.tsx / user-avatar.tsx # 会话显示/登出
apps/nextjs/src/app/admin/login/page.tsx      # 管理员登录
apps/nextjs/src/app/[lang]/(editor)/editor/cluster/[clusterId]/page.tsx # 使用 next-auth
```

### 3.2 当前 Session 与权限
- JWT 策略，`session.user` 包含 `id/name/email/image/isAdmin`。
- 管理员判定：`ADMIN_EMAIL` 逗号分隔列表。

### 3.3 现有表（Kysely）
- `User / Account / Session / VerificationToken`，以及业务表 `Customer`、`K8sClusterConfig` 通过 `authUserId` 关联用户 id。

---

## 4. 目标架构与文件布局（Better Auth）
```
packages/auth/
├── auth.ts           # Better Auth 服务端实例（Kysely + 插件）
├── client.ts         # createAuthClient 导出 signIn/signOut/useSession/getSession
├── index.ts          # 导出 auth / getCurrentUser / requireAuth 等 server helper
├── db.ts             # 复用 Kysely 连接，提供给 Better Auth database 选项
├── env.mjs           # 新增 BETTER_AUTH_SECRET，复用 GitHub/Resend

apps/nextjs/src/app/api/auth/[...all]/route.ts # toNextJsHandler(auth)
apps/nextjs/src/middleware.ts                  # 基于 auth.api.getSession 的守卫
apps/nextjs/src/types/auth.d.ts                # Better Auth Session/User 类型声明
```

核心思路：使用 `database: { db, type: "postgres" }` 直接复用 `@saasfly/db` 的 Kysely 实例；插件覆盖 GitHub OAuth + Magic Link（Resend）。

---

## 5. 迁移步骤

### 步骤 1：依赖调整（packages/auth）
```bash
cd packages/auth
pnpm remove next-auth @auth/kysely-adapter
pnpm add better-auth
```

`packages/auth/package.json` 额外注意：
- 保留 `next/react/react-dom`（Better Auth 客户端需要 React 环境）。
- 其他工作区引用（如 `@saasfly/db`）保持不变。

### 步骤 2：服务端配置 `packages/auth/auth.ts`

> 参考官方文档：https://www.better-auth.com/docs/introduction

```ts
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { MagicLinkEmail, resend, siteConfig } from "@saasfly/common";
import { db } from "@saasfly/db";
import { env } from "./env.mjs";

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,

  // Kysely 适配器 - Better Auth 原生支持
  database: {
    db,
    type: "postgres",
  },

  // Magic Link 插件
  plugins: [
    nextCookies(), // 自动处理 Next.js cookie
    magicLink({
      sendMagicLink: async ({ email, url, token }, request) => {
        await resend.emails.send({
          from: env.RESEND_FROM,
          to: email,
          subject: `Sign-in link for ${siteConfig.name}`,
          react: MagicLinkEmail({
            firstName: "",
            actionUrl: url,
            mailType: "login",
            siteName: siteConfig.name,
          }),
          headers: {
            "X-Entity-Ref-ID": new Date().getTime() + "",
          },
        });
      },
      expiresIn: 300, // 5 分钟过期
    }),
  ],

  // GitHub OAuth（官方文档：回调 URL 为 /api/auth/callback/github）
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },

  // 扩展用户字段
  user: {
    additionalFields: {
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false, // 禁止用户自行设置
      },
    },
  },
});

// 导出类型推断
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

**核心要点（来自官方文档）：**

1. Better Auth 使用 HTTP-only cookie 存储 session，无需手动管理 JWT
2. `additionalFields` 中的字段会被 CLI 自动添加到数据库 schema
3. GitHub OAuth 不返回 refresh token，access token 永久有效（除非撤销）
4. Magic Link 插件提供 `email`、`url`、`token` 三个参数

### 步骤 3：客户端实例 `packages/auth/client.ts`

```ts
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL, // 不需要加 /api/auth
  plugins: [magicLinkClient()],
});

// 解构导出常用方法
export const { signIn, signOut, useSession } = authClient;
```

**客户端使用方式（官方文档）：**

```ts
// React Hook 获取 session
const { data: session, isPending, error } = authClient.useSession();

// Magic Link 登录
await authClient.signIn.magicLink({
  email: "user@email.com",
  callbackURL: "/dashboard",
});

// GitHub 登录
await authClient.signIn.social({
  provider: "github",
  callbackURL: "/dashboard",
});

// 登出
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => router.push("/login"),
  },
});
```

### 步骤 4：集中导出（server helper）`packages/auth/index.ts`

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export { auth, type Session, type User } from "./auth";
export { authClient, signIn, signOut, useSession } from "./client";

/**
 * 服务端获取当前用户（用于 RSC / Server Actions）
 * 官方文档：https://www.better-auth.com/docs/integrations/next
 */
export async function getCurrentUser() {
  const { auth } = await import("./auth");
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}

/**
 * 服务端认证守卫，未登录则重定向
 */
export async function requireAuth(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}
```

**服务端使用示例（官方文档）：**

```tsx
// 在 React Server Component 中
import { auth } from "@saasfly/auth";
import { headers } from "next/headers";

export async function ServerComponent() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  // 基于 session 渲染内容
}
```

### 步骤 5：API Route 替换
- 删除：`apps/nextjs/src/app/api/auth/[...nextauth]/route.ts`
- 新建：`apps/nextjs/src/app/api/auth/[...all]/route.ts`
```ts
import { auth } from "@saasfly/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler(auth);
```

### 步骤 6：tRPC 上下文与路由
`packages/api/src/trpc.ts`：
```ts
import type { NextRequest } from "next/server";
import { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { auth } from "@saasfly/auth";
import { transformer } from "./transformer";

export const createTRPCContext = async ({ req }: { req: NextRequest }) => {
  const session = await auth.api.getSession({ headers: req.headers });
  return { req, session, userId: session?.user.id };
};

const t = initTRPC.context<typeof createTRPCContext>().create({ transformer, /* errorFormatter 保留 */ });
export const createTRPCRouter = t.router;
export const procedure = t.procedure;
export const protectedProcedure = procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
```
业务路由中直接使用 `ctx.session` / `ctx.userId`，移除 `getServerSession`。

### 步骤 7：中间件迁移 `apps/nextjs/src/middleware.ts`
- 移除 `withAuth` / `getToken`。
- 直接调用 `auth.api.getSession({ headers: request.headers })` 判断登录与 `isAdmin`。
- 路由白名单/重定向逻辑保持不变。

示例核心片段：
```ts
import { auth } from "@saasfly/auth";
// ...
const session = await auth.api.getSession({ headers: request.headers });
const isAuth = !!session;
const isAdmin = session?.user.isAdmin;
// 按现有逻辑处理 locale & 路由跳转
```

### 步骤 8：前端组件替换 API
- `next-auth/react` -> `@saasfly/auth/client` 导出的 `signIn / signOut / useSession`.
- Email 登录：`signIn.magicLink({ email, callbackURL })`。
- GitHub 登录：`signIn.social({ provider: "github", callbackURL })`。
- 会话：`const { data: session } = useSession();`。
- 受影响文件（至少）：  
  - `apps/nextjs/src/components/user-auth-form.tsx`（魔法链路 + GitHub）  
  - `apps/nextjs/src/components/sign-in-modal.tsx`  
  - `apps/nextjs/src/components/user-account-nav.tsx`  
  - `apps/nextjs/src/components/user-avatar.tsx`  
  - `apps/nextjs/src/app/admin/login/page.tsx`

### 步骤 9：类型与声明
- 移除 `apps/nextjs/src/types/next-auth.d.ts`，新增 `types/auth.d.ts`（Better Auth Session/User）。
- 组件/服务端类型引用统一从 `authClient.$Infer.Session` 或 `auth.options` 推断。

### 步骤 10：环境变量
- 新增：`BETTER_AUTH_SECRET`（替代 `NEXTAUTH_SECRET`）。
- 保留：`GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`RESEND_API_KEY`、`RESEND_FROM`、`ADMIN_EMAIL`、`NEXT_PUBLIC_APP_URL`。
- `.env.example` 与 `.env.local` 同步更新。

---

## 6. 数据库与数据迁移

### 6.1 Better Auth 核心表结构（官方文档）

Better Auth 需要 4 个核心表，使用小写表名：

**user 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (PK) | 唯一标识 |
| name | string | 显示名称 |
| email | string (unique) | 邮箱地址 |
| emailVerified | boolean | 是否已验证 |
| image | string? | 头像 URL |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

**session 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (PK) | 唯一标识 |
| userId | string (FK) | 关联用户 |
| token | string (unique) | Session token |
| expiresAt | Date | 过期时间 |
| ipAddress | string? | IP 地址 |
| userAgent | string? | 设备信息 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

**account 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (PK) | 唯一标识 |
| userId | string (FK) | 关联用户 |
| accountId | string | 提供者账户 ID |
| providerId | string | 提供者标识 |
| accessToken | string? | 访问令牌 |
| refreshToken | string? | 刷新令牌 |
| accessTokenExpiresAt | Date? | 访问令牌过期时间 |
| refreshTokenExpiresAt | Date? | 刷新令牌过期时间 |
| scope | string? | OAuth scope |
| idToken | string? | ID token |
| password | string? | 密码 (用于密码登录) |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

**verification 表**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | string (PK) | 唯一标识 |
| identifier | string | 验证请求标识 |
| value | string | 验证值 |
| expiresAt | Date | 过期时间 |
| createdAt | Date | 创建时间 |
| updatedAt | Date | 更新时间 |

### 6.2 使用 CLI 迁移（推荐）

Better Auth 提供 CLI 工具自动处理 schema：

```bash
# 方式 1：交互式迁移（检查并提示添加缺失表/列）
npx @better-auth/cli migrate

# 方式 2：生成 SQL 文件手动执行
npx @better-auth/cli generate
```

> CLI 仅支持内置 Kysely 适配器。运行前确保 `auth.ts` 配置正确。

### 6.3 手动迁移脚本（可选）

如果 CLI 不满足需求，可使用以下脚本：

```ts
// scripts/run-better-auth-migrations.ts
import { getMigrations } from "better-auth/db";
import { db } from "@saasfly/db";
import { env } from "@saasfly/auth/env.mjs";

async function main() {
  const { runMigrations } = await getMigrations({
    database: { db, type: "postgres" },
    baseURL: env.NEXT_PUBLIC_APP_URL,
    secret: env.BETTER_AUTH_SECRET,
  });
  await runMigrations();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### 6.4 数据迁移（用户/账户）

```ts
// scripts/migrate-auth-data.ts
import { db } from "@saasfly/db";
import { env } from "@saasfly/auth/env.mjs";

async function migrate() {
  console.log("migrating users...");
  const adminEmails = (env.ADMIN_EMAIL || "").split(",").map((s) => s.trim());

  const users = await db.selectFrom("User").selectAll().execute();
  for (const user of users) {
    await db
      .insertInto("user")
      .values({
        id: user.id,
        email: user.email!,
        name: user.name,
        image: user.image,
        emailVerified: !!user.emailVerified,
        isAdmin: user.email && adminEmails.includes(user.email),
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  console.log("migrating accounts...");
  const accounts = await db.selectFrom("Account").selectAll().execute();
  for (const account of accounts) {
    await db
      .insertInto("account")
      .values({
        id: account.id,
        userId: account.userId,
        providerId: account.provider,
        accountId: account.providerAccountId,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        accessTokenExpiresAt: account.expires_at
          ? new Date(account.expires_at * 1000)
          : null,
        scope: account.scope,
        idToken: account.id_token,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  }

  console.log("done");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
```
> Session 不迁移（Better Auth 会重新发 cookie）。业务表 `Customer` / `K8sClusterConfig` 引用的是用户 id，保持不变即可。

### 6.5 执行顺序

```bash
# 1) 备份
pg_dump $POSTGRES_URL > backup_before_better_auth.sql

# 2) 生成 Better Auth 表
pnpm tsx scripts/run-better-auth-migrations.ts

# 3) 数据迁移
pnpm tsx scripts/migrate-auth-data.ts

# 4) 验证
psql $POSTGRES_URL -c 'select count(*) from "user";'
```

---

## 7. 代码改动清单

### 7.1 packages/auth（核心认证包）

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 移除 `next-auth`/`@auth/kysely-adapter`，添加 `better-auth` |
| `auth.ts` | 新建 | Better Auth 服务端配置 |
| `client.ts` | 新建 | 客户端实例导出 |
| `index.ts` | 修改 | 导出 server helper（`getCurrentUser`/`requireAuth`） |
| `env.mjs` | 修改 | 新增 `BETTER_AUTH_SECRET`，移除 `NEXTAUTH_SECRET`/`NEXTAUTH_URL` |
| `db.ts` | 修改 | 更新 Kysely 类型定义（小写表名） |

### 7.2 packages/api（tRPC 路由）

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/trpc.ts` | 修改 | 移除 `next-auth/jwt`，改用 `auth.api.getSession` |
| `src/router/customer.ts` | 修改 | 移除 `getServerSession`，使用 `ctx.session` |
| `src/router/k8s.ts` | 修改 | 移除 `getServerSession`，使用 `ctx.session` |

### 7.3 apps/nextjs（Next.js 应用）

**API 路由：**

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/auth/[...nextauth]/route.ts` | 删除 | 移除 NextAuth handler |
| `src/app/api/auth/[...all]/route.ts` | 新建 | Better Auth handler |

**中间件与配置：**

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/middleware.ts` | 修改 | 移除 `withAuth`/`getToken`，改用 `auth.api.getSession` |
| `src/env.mjs` | 修改 | 更新环境变量引用（`BETTER_AUTH_SECRET`） |

**前端组件：**

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/components/user-auth-form.tsx` | 修改 | 使用 `authClient.signIn.magicLink`/`social` |
| `src/components/sign-in-modal.tsx` | 修改 | 使用 `authClient.signIn.social` |
| `src/components/user-account-nav.tsx` | 修改 | 使用 `authClient.signOut`/`useSession` |
| `src/components/user-avatar.tsx` | 修改 | 使用 `useSession` |
| `src/components/navbar.tsx` | 修改 | 更新 session 获取方式 |
| `src/components/user-name-form.tsx` | 修改 | 移除 next-auth 依赖 |

**页面：**

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/admin/login/page.tsx` | 修改 | 使用 Better Auth 登录 |
| `src/app/[lang]/(editor)/editor/cluster/[clusterId]/page.tsx` | 修改 | 更新 session 获取 |

**类型声明：**

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/types/next-auth.d.ts` | 删除 | 移除 NextAuth 类型扩展 |
| `src/types/auth.d.ts` | 新建 | Better Auth 类型声明（可选，类型可从 auth 推断） |

### 7.4 环境变量

| 文件 | 操作 | 说明 |
|------|------|------|
| `.env.example` | 修改 | 更新示例配置 |
| `.env.local` | 修改 | 更新实际配置 |

### 7.5 数据库迁移脚本

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/run-better-auth-migrations.ts` | 新建 | 执行 Better Auth schema 迁移 |
| `scripts/migrate-auth-data.ts` | 新建 | 用户/账户数据迁移 |

---

## 8. 测试计划

- **单元/类型**：`packages/auth` typecheck（Better Auth 配置、hooks 类型推断）。
- **集成**：
  - GitHub OAuth 登录（含回跳、session cookie）。
  - Email Magic Link 登录（收件、验证链接、回跳）。
  - tRPC 受保护路由（`mySubscription`、`k8s` 系列）返回 401/正常。
  - Middleware：未登录访问受保护页跳转登录；管理员路径仅管理员可进。
- **E2E（手动）**：
  - 多语言路由保持登录态。
  - 登出后 cookie 清理、再访问跳转登录。
  - `ADMIN_EMAIL` 列表中的账号登录后 `isAdmin` 为 true。

---

## 9. 回滚方案

1) 代码：保留迁移前标签（如 `pre-better-auth-migration`），必要时 `git checkout` 回滚。
2) 数据：使用 `backup_before_better_auth.sql` 还原；或删除新表后重推旧 Schema。
3) 环境：恢复 `.env` 中 `NEXTAUTH_SECRET/NEXTAUTH_URL` 并重新部署 NextAuth handler。  

---

## 10. 风险与注意事项

- **Middleware 兼容性**：Better Auth 基于 cookie，确保 edge 中间件能访问到 cookie（使用 `auth.api.getSession`，避免自定义 fetch）。
- **表名大小写**：Better Auth 使用小写表名；若数据库使用大小写混合，确认迁移脚本与大小写一致。
- **管理员标记**：需要在迁移脚本或首登 hook 中写入 `isAdmin`，否则管理员权限丢失。
- **前端回跳**：`baseURL` 与 `basePath` 要和 `createAuthClient` 一致，避免 Magic Link 回跳到错误地址。
- **会话失效**：迁移后旧 JWT 无效，需提前告知用户需要重新登录。  

---

## 11. 迁移执行记录

### 已完成的更改

**代码更改：**
- ✅ `packages/auth/package.json` - 依赖更新
- ✅ `packages/auth/auth.ts` - Better Auth 服务端配置
- ✅ `packages/auth/client.ts` - 客户端实例
- ✅ `packages/auth/index.ts` - Server helpers（使用动态导入避免 pages 目录问题）
- ✅ `packages/auth/db.ts` - 重新导出 @saasfly/db 类型
- ✅ `packages/auth/env.mjs` - BETTER_AUTH_SECRET
- ✅ `packages/api/src/trpc.ts` - 使用 auth.api.getSession
- ✅ `packages/api/src/router/*.ts` - 移除 getServerSession
- ✅ `packages/common/src/env.mjs` - BETTER_AUTH_SECRET
- ✅ `apps/nextjs/src/app/api/auth/[...all]/route.ts` - 新建
- ✅ `apps/nextjs/src/app/api/auth/[...nextauth]/` - 删除
- ✅ `apps/nextjs/src/middleware.ts` - 使用 Better Auth
- ✅ `apps/nextjs/src/env.mjs` - 环境变量更新
- ✅ `apps/nextjs/src/types/next-auth.d.ts` - 删除
- ✅ 所有前端组件 - 使用 authClient

**数据库更改：**
- ✅ `packages/db/prisma/schema.prisma` - 添加 Better Auth 表定义
- ✅ `packages/db/migrations/001_better_auth.sql` - 迁移脚本
- ✅ 数据库表创建完成（user, session, account, verification）

### 注意事项

1. **动态导入**: `packages/auth/index.ts` 使用动态导入 `next/headers` 避免在 pages 目录中出错
2. **类型扩展**: User 类型手动扩展 `isAdmin?: boolean | null` 字段
3. **Session 类型**: 包含 `session` 和 `user` 两个属性

---

文档版本：2.0
最后更新：2026-01-03
维护人：AI Assistant
状态：✅ 迁移完成
