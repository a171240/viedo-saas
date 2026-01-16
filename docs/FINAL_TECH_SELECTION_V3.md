# VideoFly 最终技术选型方案 V3 (对齐 mksaas-template)

## 文档信息
- **版本**: 3.0 (最终版)
- **更新日期**: 2025-01-16
- **对齐目标**: mksaas-template (除框架版本暂不升级)
- **状态**: 定版

## 作废说明
以下文档已废弃，以本 V3 为唯一执行依据:
- docs/FINAL_TECH_SELECTION.md
- docs/FINAL_TECH_SELECTION_V2.md
- docs/MIGRATION_PLAN.md
- docs/MIGRATION_CHECKLIST.md
- docs/TECHNICAL_ARCHITECTURE.md

---

## 一、核心原则

1. **架构对齐 mksaas-template**: 关键技术选型保持一致，避免二次返工。
2. **框架版本暂不升级**: Next/React/TS 保持当前版本，降低兼容性风险。
3. **接受 Drizzle 迁移成本**: 以长期维护性与生态工具为优先。
4. **移除 tRPC**: Server Actions + REST 为唯一 API 形态。
5. **单应用结构**: 彻底移除 monorepo 与 workspace 依赖。
6. **业务逻辑保持一致**: 积分冻结/结算机制保留，AI 抽象保留。

---

## 二、最终选型对比 (对齐 mksaas)

| 技术模块 | 当前 | mksaas-template | **V3 最终选择** | 说明 |
|---------|------|----------------|----------------|------|
| Next.js | 15.1.6 | 16.1.0 | **15.1.6** | 暂不升级 |
| React | 19.0.0 | 19.2.3 | **19.0.0** | 暂不升级 |
| TypeScript | 5.4.5 | 5.8.3 | **5.4.5** | 暂不升级 |
| ORM | Kysely 0.27.3 | Drizzle 0.39.3 | **Drizzle 0.39.3** | 接受迁移成本 |
| DB Driver | @vercel/postgres-kysely | postgres | **postgres 3.4.5** | 对齐模板 |
| 认证 | Better Auth 1.2.5 | Better Auth 1.4.5 | **1.4.5** | 对齐模板 |
| API 架构 | REST + tRPC | REST + Server Actions | **REST + Server Actions** | 移除 tRPC |
| Server Actions | 无 | next-safe-action | **next-safe-action 8.0.11** | 标准化 SA |
| 样式 | Tailwind 3.4.1 | Tailwind 4.0.14 | **Tailwind 4.0.14** | 对齐模板 |
| 工具链 | ESLint + Prettier | Biome | **Biome 1.9.4** | 对齐模板 |
| 存储 | AWS SDK v3 | s3mini | **s3mini 0.2.0** | 对齐模板 |
| 支付 | Stripe + Creem | Stripe | **Stripe + Creem** | 业务需要 |
| AI SDK | 自定义抽象 | Vercel AI SDK | **保持自定义** | 业务特性 |
| i18n | next-intl | next-intl | **保持** | 不变 |
| 状态管理 | TanStack Query | TanStack Query | **保持** | 不变 |

---

## 三、关键架构决策

### 3.1 ORM: Kysely -> Drizzle
- **原因**: 模板一致、生态完善、迁移工具成熟。
- **决策**: 全量替换 Kysely 查询与类型生成。
- **约束**: 以现有生产库为真，先做 schema 对齐，再做迁移体系。

### 3.2 API: 移除 tRPC
- **原因**: 与模板一致，减少维护成本，简化客户端依赖。
- **决策**: 全部 tRPC 路由改为 Server Actions 或 REST。
- **保留**: REST 用于 webhooks 和外部回调。

### 3.3 Tooling: Biome + Tailwind v4
- **原因**: 对齐模板，编译/格式化一致。
- **决策**: 移除 ESLint/Prettier，迁移到 Biome。
- **约束**: Tailwind v4 采用 CSS @theme 配置。

### 3.4 Storage: AWS SDK -> s3mini
- **原因**: 依赖更轻，API 简洁，与模板一致。
- **决策**: 全量替换存储层实现。

### 3.5 认证: Better Auth 1.4.5 + Drizzle Adapter
- **原因**: 版本对齐模板，适配 Drizzle。
- **决策**: 替换数据库适配器，保留 Creem 插件与 Magic Link 逻辑。
- **注意**: 需要确认 `@creem_io/better-auth` 与 1.4.5 兼容。

---

## 四、迁移影响汇总

| 领域 | 影响范围 | 风险 | 备注 |
|------|---------|------|------|
| ORM | 全量 DB 查询 | 高 | 需要完整测试 |
| API | 前端调用层 | 中 | tRPC 移除 |
| 样式 | 全局 CSS | 中 | Tailwind v4 |
| 工具链 | lint/format | 低 | Biome |
| 存储 | 上传/下载 | 中 | s3mini 替换 |
| 认证 | 登录流程 | 中 | Adapter 变更 |

---

## 五、最终确认清单 (必须确认)

- [ ] 同意保持 Next.js 15.1.6 / React 19.0.0 / TS 5.4.5
- [ ] 同意 ORM 全量迁移到 Drizzle
- [ ] 同意移除 tRPC
- [ ] 同意迁移到 Tailwind v4 + Biome
- [ ] 同意存储改为 s3mini
- [ ] 同意 Better Auth 升级并改用 Drizzle Adapter

---

## 六、参考模板

- mksaas-template: `/Users/cheche/workspace/mksaas-template`
  - `drizzle.config.ts`
  - `src/db/schema.ts`
  - `src/db/index.ts`
  - `src/lib/auth.ts`
  - `src/lib/safe-action.ts`
  - `biome.json`
  - `src/styles/globals.css`
