# VideoFly 开发文档（迁移/新电脑快速上手）

> 适用于在新电脑上继续开发本仓库

## 项目目标与规则（摘要）
- 目标：将模板升级为面向海外获客/付费的 AI Video SaaS，默认英文 `/en`
- 核心卖点：Prompt Studio 工作流 + 4x4 内容日历 + 场景化入口
- 规则：i18n 全覆盖；生成/回调安全；/api/v1 合约不破坏；配置优先写入 `src/config/*`

## 全量开发文档（原始需求）
- 详细规格见：`docs/VIDEOFLY_DEV_SPEC.md`

## 当前开发进度（已推送到 main）
> 说明：以下为我已完成并推送到 `main` 的部分（可在新电脑直接拉取）。

### 已完成（确认）
- P1-03 批量排队（Prompt Studio 4x4 选题批量排队）
- P1-04 Batch Variations（变体 Prompt 生成 + 多任务排队）
- P1-05 Brand Kit（设置页 + 生成器/产品页追加约束）
- P1-06 Share + Remix（分享页 + Remix 回填）

### 已完成内容细节
- P1-03：Prompt Studio 输出可批量排队（一次创建多任务），并在生成器/产品页内触发排队。
- P1-04：/product-to-video 变体数量=多个不同 Prompt，逐条创建独立任务；credits 预估 = 单次 * 变体数。
- P1-05：
  - Settings 中新增 Brand Kit（brandTone / styleSuffix / bannedWords / 默认比例&时长）
  - 生成器与 product-to-video 支持 Brand Kit 开关，开启时自动追加约束到 prompt
  - 本地存储 key：`videofly_brand_kit`
- P1-06：
  - 分享页：`/[locale]/share/[uuid]`
  - Remix：将参数写入 `sessionStorage`（key：`videofly_tool_prefill`），跳转到工具页回填

### 未确认/待复核（请以提交历史与页面表现为准）
- P0-01 ~ P0-10：未在此文档内逐项确认（请按回归清单验证）
- P1-01 / P1-02：需复核当前实现是否满足最新要求（Prompt Studio 模板/入口是否已补齐）

### 当前验证状态
- 自动化验证：P1-05 的 Playwright 脚本未完全跑通（Cookie Consent 弹窗遮挡、credit/balance 加载时机影响点击）
- 手工验证可用：/en/text-to-video、/en/image-to-video、/en/product-to-video

## 接下来要做的任务（建议顺序）
> 说明：以下为当前剩余/待复核项，按优先级排序。

### 1) 补齐 P1-02 Prompt Studio（若未完全落地）
- 确认目录结构：`src/config/prompt-studio/*`、`src/components/prompt-studio/*`
- 确认 EN / ZH 模板字段与输出文案完整
- 生成器/产品页入口：Dialog 4 步流程 + “使用该提示词”回填
- 无外部 LLM 的模板拼装逻辑可用

### 2) 复核 P1-01 Product-to-Video 入口（若未完整）
- 路由：`/[locale]/product-to-video`
- 表单字段：images、productName、keyBenefits、targetAudience、platform、style、variationCount
- Prompt Studio 结果可回填到生成器 prompt
- Advanced 才显示模型选择

### 3) 完成 P1-05 的自动化验证
- Playwright 脚本：预写 `localStorage` 关闭 Cookie Banner
- 等待 `/api/v1/credit/balance` 返回后再点击生成
- 验证 Brand Kit 开关前后 prompt 的追加内容

### 4) 全面回归 P0（若仍有未验收项）
- P0-01 ~ P0-10 逐项核对（i18n、Pricing、Credits 解释器、模型能力矩阵、Cookie Consent、Webhook 验签+幂等等）
- /en 与 /zh 页面文案一致性检查

### 5) 补充 P1-06 分享链路的验收
- Share 页可访问、参数可展示、Remix 可回填

## 1. 克隆仓库
```bash
git clone https://github.com/a171240/viedo-saas.git
cd viedo-saas
```

## 2. 环境准备
- Node.js >= 18
- pnpm 9.15.1（package.json 已固定）

## 3. 安装依赖
```bash
pnpm install
```

## 4. 环境变量
```bash
cp .env.example .env.local
```
按需填写 `.env.local`（数据库、鉴权、存储、AI 提供商、Webhook 等）。

### 本地免登录（可选）
```env
# .env.local
DEV_BYPASS_AUTH=true
NEXT_PUBLIC_DEV_BYPASS_AUTH=true
# 可选：指定邮箱，不存在会自动创建
DEV_BYPASS_USER_EMAIL=dev@example.com
```

## 5. 数据库迁移
```bash
pnpm db:generate
pnpm db:migrate
```

## 6. 启动开发
```bash
pnpm dev
```
指定端口（示例 3003）：
```bash
# Windows
set PORT=3003 && pnpm dev

# macOS / Linux
PORT=3003 pnpm dev
```

## 7. 常用命令
```bash
pnpm typecheck
pnpm build
pnpm lint
```

## 8. 最小回归清单（手工）
- /en 首页加载正常，无占位数据
- /en & /zh Pricing：订阅 / 一次性积分包切换正确
- /en & /zh 生成器页面：文案语言正确
- /en/reference-to-video 与 /zh/reference-to-video 正常
- Cookie Consent 可切换，未同意不加载 analytics

## 9. 常见问题
- 端口被占用：更换端口或停止占用进程
- dev 启动慢：首次编译耗时较久，属正常现象
- 权限/登录：使用 DEV_BYPASS_AUTH 或配置真实 OAuth

---

如需我继续补充部署、测试、Playwright 脚本模板，请告诉我。
