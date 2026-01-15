# Saasfly AI 视频应用改造开发计划

## 项目概述

将 Saasfly SaaS 模板改造为 AI 视频生成应用，参考 JoyflixAI 实现。

### 核心改造点

1. **后端架构**: TRPC → Next.js API Routes
2. **新增功能**: 积分系统、AI 视频生成、Creem 支付
3. **版本升级**: Next.js 14 → 15, React 18 → 19

---

## 文档导航

### 开发阶段文档

| 阶段 | 文档 | 核心内容 | 预计文件数 |
|------|------|----------|-----------|
| Phase 1 | [01-PHASE1-INFRASTRUCTURE.md](./01-PHASE1-INFRASTRUCTURE.md) | 版本升级 + API 架构迁移 | ~15 |
| Phase 2 | [02-PHASE2-DATA-LAYER.md](./02-PHASE2-DATA-LAYER.md) | DB Schema + 文件存储 | ~10 |
| Phase 3 | [03-PHASE3-CREDITS.md](./03-PHASE3-CREDITS.md) | Credit 完整实现 | ~8 |
| Phase 4 | [04-PHASE4-VIDEO-CORE.md](./04-PHASE4-VIDEO-CORE.md) | 模型配置 + API + Callback | ~12 |
| Phase 5 | [05-PHASE5-FRONTEND.md](./05-PHASE5-FRONTEND.md) | 生成页 + 历史页 | ~6 |
| Phase 6 | [06-PHASE6-CREEM.md](./06-PHASE6-CREEM.md) | 支付集成 | ~5 |

### 附录文档

| 文档 | 内容 |
|------|------|
| [A1-FILES-AND-ENV.md](./A1-FILES-AND-ENV.md) | 完整文件清单、环境变量、依赖版本 |
| [A2-SUPPLEMENTARY-IMPL.md](./A2-SUPPLEMENTARY-IMPL.md) | 补充实现（presign、组件、限流等） |
| [A3-ADVANCED-DOCS.md](./A3-ADVANCED-DOCS.md) | 进阶文档（Creem、Video API、设计决策） |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志 |

---

## 快速定位

### 按功能查找

| 功能 | 位置 |
|------|------|
| 积分冻结/结算/释放 | [Phase 3 - 3.5 积分 Service 层](./03-PHASE3-CREDITS.md#35-积分-service-层) |
| AI Provider 抽象 | [Phase 4 - 4.2.1 AI Provider 抽象层](./04-PHASE4-VIDEO-CORE.md#421-ai-provider-抽象层) |
| 回调签名验证 | [Phase 4 - 4.2.3 回调签名验证工具](./04-PHASE4-VIDEO-CORE.md#423-回调签名验证工具) |
| Creem 支付集成 | [Phase 6 - 6.3.3 服务端配置](./06-PHASE6-CREEM.md#633-服务端配置) |
| 幂等性保护 | [A2 - A2.5 Creem onGrantAccess 幂等性保护](./A2-SUPPLEMENTARY-IMPL.md#a25-creem-ongrantaccess-幂等性保护) |
| API 限流 | [A2 - A2.8 API 限流中间件](./A2-SUPPLEMENTARY-IMPL.md#a28-api-限流中间件) |
| 退款处理 | [A3 - A3.1.2 退款处理](./A3-ADVANCED-DOCS.md#a312-退款处理) |
| 视频重试 | [A3 - A3.2.1 失败视频重试机制](./A3-ADVANCED-DOCS.md#a321-失败视频重试机制) |

### 按文件查找

| 文件路径 | 位置 |
|----------|------|
| `packages/common/src/services/credit.ts` | [Phase 3](./03-PHASE3-CREDITS.md#35-积分-service-层) |
| `packages/common/src/services/video.ts` | [Phase 4](./04-PHASE4-VIDEO-CORE.md#424-视频生成-service) |
| `packages/common/src/ai/*` | [Phase 4](./04-PHASE4-VIDEO-CORE.md#421-ai-provider-抽象层) |
| `apps/nextjs/src/app/api/v1/video/*` | [Phase 4](./04-PHASE4-VIDEO-CORE.md#425-视频-api-routes) |
| `apps/nextjs/src/app/api/_lib/rate-limit.ts` | [A2](./A2-SUPPLEMENTARY-IMPL.md#a28-api-限流中间件) |

---

## 相关文档

- [API-INTEGRATION-GUIDE.md](../API-INTEGRATION-GUIDE.md) - evolink/kie API 详细文档
- [video-generator-input.md](../video-generator-input.md) - 前端组件文档
