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

## 技术栈（摘要）
- Next.js 15 / React 19
- TypeScript
- Drizzle ORM / PostgreSQL
- Tailwind CSS 4 / shadcn/ui
- Better Auth / Creem / Stripe
