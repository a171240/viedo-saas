# VideoFly 迁移方案 - 执行总结 (V3 落地版)

## 一句话总结

**参考 mksaas-template，完成从 monorepo 到单 Next.js 应用的迁移，核心栈落地为 Drizzle + Server Actions + Tailwind v4 + Biome，并保留 VideoFly 特有的异步视频与积分冻结/结算逻辑。**

---

## 核心决策 (最终状态)

| 技术栈 | 当前状态 | 最终选择 | 说明 |
|--------|---------|---------|------|
| 架构 | Turborepo Monorepo | 单应用 | 完成迁移 |
| ORM | Kysely | Drizzle | 已切换并完成查询重写 |
| Next.js | 15.1.6 | 15.1.6 | 暂不升级，避免兼容风险 |
| React | 19.0.0 | 19.0.0 | 暂不升级 |
| TypeScript | 5.4.5 | 5.4.5 | 暂不升级 |
| API | REST + tRPC | REST + Server Actions | 已移除 tRPC |
| 工具 | ESLint + Prettier | Biome | 已替换 |
| 样式 | Tailwind v3 | Tailwind v4 | 已升级 |
| 存储 | AWS SDK | s3mini | 已替换 |
| 支付 | Stripe | Creem 主 + Stripe 备份 | 双通道保留 |

---

## 保留不变

| 模块 | 理由 |
|------|------|
| 积分冻结/结算 | 视频生成异步流程必须保留 |
| 自定义 AI 抽象 | Vercel AI SDK 不支持视频 |
| Better Auth | 保持并升级到 1.4.5 |
| PostgreSQL | 数据库不变 |

---

## 与 mksaas-template 的对齐要点

### 对齐部分

```
├── 单应用架构
├── Better Auth
├── Drizzle ORM
├── Stripe 支付
├── Tailwind v4
└── Server Actions
```

### 差异部分

| 方面 | mksaas-template | VideoFly | 处理方式 |
|------|----------------|----------|---------|
| 业务类型 | 图片生成 (同步) | 视频生成 (异步) | 保留回调机制 |
| 积分系统 | 直接扣减 | 冻结/结算 | 保留 VideoFly 方式 |
| 支付 | Stripe 为主 | Creem 为主 | 双通道并行 |

---

## 已完成清单 (关键落地)

- [x] monorepo -> 单应用目录结构
- [x] Drizzle schema + 查询重写
- [x] tRPC 彻底移除，改为 Server Actions
- [x] Better Auth 1.4.5 + Drizzle adapter
- [x] s3mini 存储替换 (上传/回调/下载)
- [x] Tailwind v4 迁移
- [x] Biome 替代 ESLint/Prettier
- [x] Stripe + Creem 并行支付

---

## 关键落地变更 (路径参考)

- Drizzle: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`
- Server Actions: `src/actions/*`, `src/lib/safe-action.ts`
- Better Auth: `src/lib/auth/*`, `src/app/api/auth/[...all]/route.ts`
- 存储: `src/lib/storage.ts`, `src/app/api/v1/upload/route.ts`
- 支付: `src/payment/*`, `src/services/billing.ts`, `src/app/api/webhooks/stripe/route.ts`
- Tailwind v4: `src/styles/globals.css`, `postcss.config.mjs`, `tailwind.config.ts`
- 工具链: `biome.json`, `package.json`

---

## 验证结果

已执行并通过:

- `pnpm install`
- `pnpm content`
- `pnpm typecheck`
- `pnpm lint`

未执行:

- `pnpm build` (生产构建)
- 真实支付/回调链路验证

---

## 待办 / 风险

- 生产构建与部署验证未完成 (建议执行 `pnpm build` + 预发部署)
- 依赖警告仍存在 (Next 15.1.6 安全公告、posthog-js 过期、React 19 peer)
- 旧 monorepo 目录仍保留 (已通过 tsconfig/biome 排除)
- 数据库迁移需在目标环境确认 (建议执行 `pnpm db:push` 或 `pnpm db:migrate`)

---

## 成功标准 (当前状态)

- [x] 单应用可启动
- [x] Drizzle 查询可用
- [x] Better Auth 登录/注册通过
- [x] Server Actions 可用
- [x] 积分冻结/结算逻辑保留
- [x] Biome/Typecheck 通过
- [ ] 生产构建通过
- [ ] 预发/线上部署验证
- [ ] 支付与 webhook 端到端验证

---

## 结论

迁移的核心目标已完成，当前进入 **部署验证与生产检查阶段**。后续重点为构建、支付链路验证与生产环境稳定性确认。

