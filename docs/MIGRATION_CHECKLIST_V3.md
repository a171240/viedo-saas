# VideoFly 迁移执行清单 V3

## 使用说明
- 每个任务开始前填入开始日期
- 完成后将 `[ ]` 改为 `[x]`
- 备注记录问题与结论

---

## 阶段 0: 准备与基线
- [ ] 备份数据库 (生产/开发)
- [ ] 备份环境变量 `.env.local`
- [ ] 记录现有 API 端点与关键流程
- [ ] 确认 Node/pnpm 版本策略

备注: ________

## 阶段 1: 依赖与工具链
- [ ] root `package.json` 合并依赖
- [ ] 添加 `biome.json`
- [ ] 移除 ESLint/Prettier/turbo/workspace 相关配置
- [ ] 更新根脚本 `dev/build/start/lint/typecheck`

备注: ________

## 阶段 2: 目录重构
- [ ] 创建 `src/` 目标结构
- [ ] 迁移 `apps/nextjs/src` 到 `src`
- [ ] 更新路径别名与导入
- [ ] 验证 Next.js 能启动

备注: ________

## 阶段 3: ORM 迁移 (Drizzle)
- [ ] 添加 `drizzle.config.ts`
- [ ] 生成/编写 `src/db/schema.ts`
- [ ] 建立 baseline migration
- [ ] 替换查询为 Drizzle

备注: ________

## 阶段 4: 认证与 Creem 兼容性
- [ ] 升级 Better Auth 1.4.5
- [ ] 验证 `@creem_io/better-auth` 兼容性
- [ ] 迁移 auth adapter 到 Drizzle
- [ ] 验证 Magic Link

备注: ________

## 阶段 5: API 重构
- [ ] 移除 tRPC 依赖与路由
- [ ] 建立 Server Actions
- [ ] REST API 保留 webhook/回调/上传

备注: ________

## 阶段 6: 存储迁移
- [ ] 替换为 s3mini
- [ ] 验证上传/下载/预签名

备注: ________

## 阶段 7: 支付与积分
- [ ] Stripe + Creem 功能对等
- [ ] Webhook 各自独立
- [ ] 积分冻结/结算保持一致

备注: ________

## 阶段 8: UI 与样式
- [ ] Tailwind v4 迁移
- [ ] UI 组件迁移

备注: ________

## 阶段 9: 测试与验收
- [ ] 类型检查
- [ ] 生产构建
- [ ] 关键业务流程测试

备注: ________

