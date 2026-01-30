# VideoFly 开发文档（迁移/新电脑快速上手）

> 适用于在新电脑上继续开发本仓库

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
