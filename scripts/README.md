# Scripts

积分系统管理脚本，用于开发和测试。

## 快速开始：设置管理员

**最简单的方法 - 使用环境变量：**

1. 在 `.env.local` 中添加：
```env
ADMIN_EMAIL="your-email@example.com"
```

2. 使用该邮箱登录 - 系统会自动设置为管理员！

3. 完成！现在可以使用下面的脚本添加测试积分了。

---

## 快捷命令

所有脚本都配置了快捷命令：

```bash
# 给用户增加积分
pnpm script:add-credits <email> <credits> [reason]

# 查询用户积分详情
pnpm script:check-credits <email>

# 清空用户积分（慎用）
pnpm script:reset-credits <email> --confirm
```

---

## 脚本列表

### 1. add-credits.ts - 给用户增加积分

```bash
pnpm script:add-credits <email> <credits> [reason]
```

**示例：**
```bash
# 给用户增加 100 积分
pnpm script:add-credits user@example.com 100

# 给用户增加 500 积分，并注明原因
pnpm script:add-credits user@example.com 500 "管理员赠送"
```

**用途：**
- 管理员给自己增加测试积分
- 给用户补偿积分
- 特殊活动赠送积分

---

### 2. check-user-credits.ts - 查询用户积分详情

```bash
pnpm script:check-credits <email>
```

**示例：**
```bash
pnpm script:check-credits user@example.com
```

**输出内容：**
- 用户基本信息
- 所有积分包列表
- 总积分统计（总额、已用、冻结、可用）
- 最近 10 条交易记录

---

### 3. reset-user-credits.ts - 清空用户积分（慎用！）

```bash
pnpm script:reset-credits <email> --confirm
```

**示例：**
```bash
pnpm script:reset-credits user@example.com --confirm
```

**⚠️ 警告：**
- 此操作不可逆
- 会删除所有积分包和交易记录
- 必须添加 `--confirm` 标志才能执行

**用途：**
- 清理测试用户数据
- 重新初始化用户积分

---

## 环境变量

确保 `.env.local` 文件中配置了：

```env
# 数据库连接
DATABASE_URL=postgresql://...
POSTGRES_URL=postgresql://...

# 管理员邮箱（使用该邮箱登录自动成为管理员）
ADMIN_EMAIL="your-email@example.com"
```

---

## 首次使用

首次使用前需要安装依赖：

```bash
pnpm install
```

这会自动安装 `tsx` 运行时。

---

## UI/回归脚本（Playwright）

这些脚本用于本地快速回归关键 UI/流程（不依赖 Playwright MCP）。

一键运行（推荐）：
```bash
corepack pnpm regress
```

```bash
# P0-01/P0-02：营销页路由 + 根路径重定向
node scripts/p0-01-routes-smoke.mjs

# P0-04：Pricing（Subscription vs Credit Packs + 套餐权益展示）
BASE_URL=http://localhost:3002 node scripts/p0-04-pricing-smoke.mjs

# P0-06：/zh 文案泄漏冒烟
BASE_URL=http://localhost:3002 node scripts/p0-06-zh-smoke.mjs

# P0-09：Cookie Consent（拒绝/接受后 AnalyticsGate 状态切换）
BASE_URL=http://localhost:3002 node scripts/p0-09-cookie-consent-smoke.mjs

# P0-08：模型能力矩阵（配置驱动）一致性校验
./node_modules/.bin/tsx scripts/p0-08-model-capabilities-check.ts

# P1-01：Prompt Studio 批量排队 + image-to-video 上传/生成链路
BASE_URL=http://localhost:3002 node scripts/p1-01-ui-flow.mjs

# P1-02：Prompt Studio 模板 build 校验
./node_modules/.bin/tsx scripts/p1-02-template-build-check.ts

# P1-05：Brand Kit 自动化回归
BASE_URL=http://localhost:3002 node scripts/p1-05-playwright.mjs

# P2-03/P2-04：并发/反滥用 UI 提示与升级弹窗校验
BASE_URL=http://localhost:3002 node scripts/p2-03-04-safeguards-ui.mjs

# P2-01：Stuck Recovery（鉴权 + dry-run）
./node_modules/.bin/tsx scripts/p2-01-recovery-smoke.ts

# P2-02：可观测/成本报表（成本估算一致性）
./node_modules/.bin/tsx scripts/p2-02-admin-analytics-check.ts

# P0-10：AI 回调验签 + 幂等（webhook_events 去重）
./node_modules/.bin/tsx scripts/p0-10-callback-smoke.ts
```
