# VideoFly

一个面向海外的 AI 视频生成 SaaS（Next.js 15 + React 19）。

## 文档入口
- 当前进度与环境搭建：`docs/DEV_SETUP.md`
- 全量产品规格：`docs/VIDEOFLY_DEV_SPEC.md`
- 文档索引：`docs/INDEX.md`

## 快速开始
```bash
git clone https://github.com/a171240/viedo-saas.git
cd viedo-saas
pnpm install
cp .env.example .env.local
# 填写 .env.local 后
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## 回归/验收
```bash
# 本地一键回归（会自动启动 dev）
corepack pnpm regress

# 线上一键验收（不启动本地 dev，跑安全子集）
BASE_URL=https://viedo-saas.vercel.app corepack pnpm accept:prod
```

## 技术栈（摘要）
- Next.js 15 / React 19
- TypeScript
- Drizzle ORM / PostgreSQL
- Tailwind CSS 4 / shadcn/ui
- Better Auth / Creem / Stripe
