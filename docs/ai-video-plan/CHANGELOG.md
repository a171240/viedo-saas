# 更新日志

[← 附录 A3](./A3-ADVANCED-DOCS.md) | [返回目录](./00-INDEX.md)

---

| 日期       | 版本 | 说明                                                          |
|------------|------|---------------------------------------------------------------|
| 2025-01-15 | 1.0  | 初始版本                                                       |
| 2025-01-15 | 1.1  | 更新 Phase 4：使用 evolink + kie 替代 Replicate                  |
| 2025-01-15 | 1.2  | 更新 Phase 6：详细 Creem Better Auth 集成方案                    |
| 2025-01-15 | 1.3  | 更新环境变量、文件清单、Video Schema (添加 provider/externalTaskId) |
| 2025-01-15 | 2.0  | **重大更新** - 修复 Codex Review 发现的关键问题                    |
|            |      | - Phase 3: 重新设计积分系统 (freeze/settle/release + FIFO 过期)    |
|            |      | - Phase 4: 移除 setTimeout 轮询，改用 Callback + 前端轮询          |
|            |      | - Phase 4: 添加 HMAC 回调签名验证                                 |
|            |      | - Phase 5: 添加 video-api.ts 数据转换层，修复前后端 payload 不一致   |
|            |      | - Phase 6: 支持订阅制 + 一次性购买双模式                           |
| 2025-01-16 | 2.1  | 文档一致性修订：回调密钥命名、状态路由、Creem 交易类型与过期参数、冻结失败处理 |
|            |      | - 确认模型配置使用静态配置文件方案                                  |
| 2025-01-16 | 2.2  | **补充遗漏内容**                                                   |
|            |      | - 添加 presign 上传 API 实现                                       |
|            |      | - 添加 onGrantAccess 幂等性保护                                    |
|            |      | - 添加过期积分定时任务 (Vercel Cron)                                |
|            |      | - 修复 CreditHold Schema 关系定义                                  |
|            |      | - 添加 VideoStatusCard / VideoCard 组件实现                        |
|            |      | - 添加单个视频 API 路由实现                                         |
|            |      | - 添加 API 限流中间件                                              |
| 2025-01-16 | 2.3  | **进阶文档补充** - 修复文件清单 + 回答开放问题                        |
|            |      | - 附录 A1: 补充缺失文件 (callback-signature, credit-config 等)       |
|            |      | - 附录 A3: Creem 进阶 (Webhook 机制、退款、升降级、测试模式)           |
|            |      | - 附录 A3: 视频 API 进阶 (重试、清理、并发限制、错误码)                |
|            |      | - 附录 A3: 设计决策 (失败记录保留、Webhook 处理方式、冻结与过期交互)    |
| 2025-01-16 | 3.0  | **文档拆分** - 将大文档拆分为多个独立文件                            |
|            |      | - 创建 `docs/ai-video-plan/` 目录                                  |
|            |      | - 按开发阶段拆分为 6 个 Phase 文档                                  |
|            |      | - 附录拆分为 A1 (文件/环境变量)、A2 (补充实现)、A3 (进阶文档)         |
|            |      | - 添加导航目录 00-INDEX.md 和本更新日志                             |
| 2025-01-16 | 3.1  | 文档一致性修订：Phase 2 去除旧积分 Schema、Phase 1 API 树说明、补充幂等提示 |
|            |      | - 附录 A2: 清理未使用的示例常量                                     |
|            |      | - 附录 A3: Webhook 签名校验补充长度保护                              |
| 2025-01-16 | 3.2  | 细节优化：Phase 2 目标补充积分说明、Phase 3 验收补充 Cron 引用、Webhook 可选说明 |
| 2025-01-16 | 3.3  | 统一配置与导航：Phase 6 使用 credits.ts、附录导航统一、移除 Phase 2 AIModelConfig |
| 2025-01-16 | 3.4  | 进一步统一与标注：Phase 6 幂等示例替换、A2/A3 编号统一、旧总文档弃用标注 |
| 2025-01-16 | 3.5  | Phase 6 PricingCard 修复：使用 Phase 3 的 i18n hooks                   |
|            |      | - 导入改为 `useSubscriptionPackages`, `useOnetimePackages`             |
|            |      | - 产品类型改为 `LocalizedPackage`                                      |
|            |      | - 使用 `displayName`, `price.amount`, `localizedFeatures`             |
| 2025-01-16 | 3.6  | 包名统一更新：`@saasfly/*` → `@videofly/*`                              |
|            |      | - 更新所有文档中的包引用 (48 处)                                        |
|            |      | - 影响文件: Phase 1/3/4/5/6, A2, A3                                    |

---

[← 附录 A3](./A3-ADVANCED-DOCS.md) | [返回目录](./00-INDEX.md)
