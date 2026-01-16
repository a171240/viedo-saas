# VideoFly 迁移方案 V3 (对齐 mksaas-template)

## 文档信息
- **版本**: 3.0 (最终版)
- **更新日期**: 2025-01-16
- **基于**: `docs/FINAL_TECH_SELECTION_V3.md`

## 作废说明
以下文档已废弃，以本 V3 为唯一执行依据:
- docs/MIGRATION_PLAN.md
- docs/MIGRATION_CHECKLIST.md
- docs/TECHNICAL_ARCHITECTURE.md

---

## 一、目标与范围

### 1.1 目标
- 单应用结构，移除 monorepo 与 turbo。
- 全面对齐 mksaas-template 技术栈。
- 迁移到 Drizzle，移除 tRPC。
- 保留现有业务逻辑语义 (积分冻结/结算、AI 抽象、支付流程)。

### 1.2 非目标
- 不改变数据库业务含义 (字段语义不变)。
- 不引入新业务功能。

---

## 二、迁移前提

1. **Node.js**: 建议升级到 Node 20 LTS (对齐模板)。
2. **pnpm**: 建议使用 pnpm 10.26.1 (对齐模板)。
3. **环境变量**: 完整备份 `.env.local`。
4. **数据库备份**: 生产与开发库均备份。

---

## 三、目录与模块迁移目标

### 3.1 单应用目标结构

```
videofly/
├── src/
│   ├── app/                # Next.js App Router
│   ├── actions/            # Server Actions
│   ├── components/
│   ├── db/                 # Drizzle
│   ├── services/           # 业务服务
│   ├── lib/                # auth/safe-action/storage 等
│   ├── ai/                 # AI 抽象
│   ├── config/
│   ├── hooks/
│   ├── i18n/
│   └── types/
├── public/
├── scripts/
├── docs/
├── biome.json
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

### 3.2 包迁移映射

| 原包 | 目标路径 |
|------|---------|
| `packages/db` | `src/db` |
| `packages/common` | `src/services` + `src/ai` + `src/config` + `src/lib` |
| `packages/auth` | `src/lib/auth` |
| `packages/ui` | `src/components/ui` |
| `packages/video-generator` | `src/components/video-generator` |
| `packages/stripe` | `src/payment` |
| `packages/api` | **删除** (改为 Server Actions/REST) |
| `apps/nextjs` | `src/` (拆分迁移) |
| `apps/auth-proxy` | **删除** (如无必要) |

---

## 四、迁移阶段与步骤

### 阶段 0: 准备工作 (0.5-1 天)
- [ ] 创建新分支 `migration/v3-single-app`
- [ ] 备份数据库 (生产/开发)
- [ ] 备份环境变量
- [ ] 记录现有 API 端点与关键流程
- [ ] 锁定依赖版本 (写入 V3 文档)

### 阶段 1: 依赖与构建工具升级 (1-2 天)
- [ ] 升级 Next.js / React / TypeScript 到 V3 版本
- [ ] 迁移工具链到 Biome
  - [ ] 添加 `biome.json`
  - [ ] 移除 ESLint/Prettier 依赖与配置
- [ ] 更新 root `package.json` 脚本
- [ ] 移除 turbo 与 workspace 配置

**产出**: 新 root `package.json` + `biome.json` + 清理 monorepo 文件。

### 阶段 2: 目录重构 (1-2 天)
- [ ] 创建 `src/` 目录结构
- [ ] 迁移 `apps/nextjs/src/*` 到 `src/*`
- [ ] 修正路径别名与导入

**产出**: 单应用目录可编译运行。

### 阶段 3: ORM 迁移到 Drizzle (5 天)
- [ ] 添加 `drizzle.config.ts`
- [ ] 生成 Drizzle schema
  - 方案 A: `drizzle-kit introspect` 从现有数据库生成 schema
  - 方案 B: 手工迁移 `schema.prisma` 到 Drizzle
- [ ] 建立 baseline migration (与当前数据库保持一致)
- [ ] 替换 Kysely 查询为 Drizzle
  - `services/credit.ts`
  - `services/video.ts`
  - `auth` 相关表查询
- [ ] 更新 `src/db/index.ts` (postgres driver)

**产出**: Drizzle schema + 迁移脚本 + 查询全部替换。

### 阶段 4: 认证迁移 (1-2 天)
- [ ] 升级 Better Auth 到 1.4.5
- [ ] 替换为 `drizzleAdapter`
- [ ] 保留 Magic Link 与 Creem 插件逻辑
- [ ] 更新 `app/api/auth/[...all]/route.ts`
- [ ] 更新客户端 auth hooks

**注意**: 验证 `@creem_io/better-auth` 兼容性。

### 阶段 4.5: Better Auth 兼容性验证 (0.5 天)
- [ ] 创建测试项目验证 `@creem_io/better-auth` + Better Auth 1.4.5
- [ ] 如不兼容，评估保持 1.2.5 + Drizzle Adapter 的方案
- [ ] 确认 Magic Link 功能可用

### 阶段 5: API 重构 (3 天)
- [ ] 完全移除 tRPC 相关代码与依赖
- [ ] 建立 `src/lib/safe-action.ts`
- [ ] 将原 tRPC 调用迁移为 Server Actions
- [ ] REST API 仅保留:
  - Webhooks (Stripe/Creem)
  - AI 回调
  - 上传预签名

**产出**: Server Actions 成为主通道。

### 阶段 6: 存储迁移 (0.5-1 天)
- [ ] 实现 `src/lib/storage.ts` (s3mini)
- [ ] 替换旧存储调用
- [ ] 验证上传/下载与预签名

### 阶段 7: 支付与积分 (1-2 天)
- [ ] Stripe 对齐 mksaas 实现
- [ ] 保留 Creem (国内支付)
- [ ] 确保积分冻结/结算不变
- [ ] 补齐 webhook 处理

### 阶段 8: UI 与样式迁移 (1-2 天)
- [ ] 迁移 `packages/ui` 与 `video-generator`
- [ ] Tailwind v4 迁移
- [ ] 更新 `globals.css` 与 `@theme` 配置

### 阶段 9: 验证与收尾 (1-2 天)
- [ ] 类型检查 `pnpm typecheck`
- [ ] 构建 `pnpm build`
- [ ] 关键流程测试 (登录、支付、生成、回调、积分)
- [ ] 准备部署与回滚方案

---

## 五、关键风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Drizzle 迁移导致数据不一致 | 高 | 先基于现库 introspect + baseline |
| Better Auth 升级兼容问题 | 中 | 提前验证 Creem 插件 |
| Tailwind v4 样式回归 | 中 | 逐页对比与视觉回归 |
| tRPC 移除导致调用断裂 | 中 | 先建立 SA，再替换 UI 调用 |

---

## 六、时间估算 (明确)

| 阶段 | 明确时间 | 关键产出 |
|------|---------|---------|
| 阶段 0: 准备工作 | 1 天 | 备份 + 迁移基线 |
| 阶段 1: 依赖与工具 | 2 天 | root 依赖 + Biome |
| 阶段 2: 目录重构 | 2 天 | 单应用结构 |
| 阶段 3: ORM 迁移 | 5 天 | Drizzle schema + 查询重写 |
| 阶段 4: 认证迁移 | 2 天 | Better Auth 升级与适配 |
| 阶段 4.5: 兼容性验证 | 0.5 天 | Creem 兼容结论 |
| 阶段 5: API 重构 | 3 天 | 移除 tRPC + SA |
| 阶段 6: 存储迁移 | 1 天 | s3mini 替换 |
| 阶段 7: 支付与积分 | 2 天 | Stripe + Creem 打通 |
| 阶段 8: UI 与样式 | 2 天 | Tailwind v4 |
| 阶段 9: 验证与收尾 | 2.5 天 | 测试 + 部署准备 |
| **总计** | **~20 天** | 单应用可部署 |

---

## 七、支付策略

- **Creem**: 主要支付方式 (国内用户、加密货币)
- **Stripe**: 次要支付方式 (国际用户、备份)
- **功能对等**: 两者都支持订阅和一次性支付
- **Webhook**: 分开处理，各自有独立路由

---

## 八、交付验收标准

- [ ] 单应用可本地启动 (dev/build/start)
- [ ] 登录/注册/登出全流程正常
- [ ] 视频生成与回调正常
- [ ] 积分冻结/结算/释放一致
- [ ] Stripe + Creem 支付全流程正常
- [ ] 无 tRPC 依赖与路由
