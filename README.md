# Videofly 🎬

一个 AI 视频生成平台模板，基于 Next.js 构建，专为快速搭建 AI 视频/图片生成网站而设计。

> 本模板由 **A梦** 基于 [Saasfly](https://github.com/saasfly/saasfly) 改造，旨在适配 AI 视频网站的快速搭建。

## ✨ 核心特性

### 🎬 AI 视频生成组件

- **`@videofly/video-generator`** - 一个完全可配置的 AI 视频/图片生成输入组件
- 支持多种 AI 模型（Sora 2、Kling AI、Seedance、Hailuo AI、Vidu AI 等）
- 视频/图片双模式切换
- 多种生成模式（标准、专业、图生视频、视频续写等）
- 丰富的参数配置（宽高比、时长、分辨率、风格等）
- 中英文双语支持
- 完全可定制的 UI 和配置

### 🎨 现代化 UI 设计

- 基于 Tailwind CSS + Shadcn/ui 的精美界面
- 深色主题优化，专为视频创作场景设计
- 响应式布局，支持移动端
- 流畅的动画交互（Framer Motion）

### 🏢 企业级架构

- **Monorepo 架构** - 使用 Turborepo 管理多包项目
- **类型安全** - 全栈 TypeScript，端到端类型推导
- **tRPC** - 类型安全的 API 调用
- **Better Auth** - 现代化的身份认证方案
- **Prisma + Kysely** - 类型安全的数据库操作
- **Stripe** - 开箱即用的支付集成

### 🌍 国际化 & SEO

- 内置 i18n 国际化支持
- SEO 优化，支持元数据配置
- 多语言路由

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- PostgreSQL 数据库

### 安装

```bash
# 克隆仓库
git clone <your-repo-url>
cd videofly

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local

# 初始化数据库
pnpm db:push

# 启动开发服务器
pnpm dev:web
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果。

### 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?env=NEXT_PUBLIC_APP_URL,BETTER_AUTH_SECRET,STRIPE_API_KEY,STRIPE_WEBHOOK_SECRET,POSTGRES_URL,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,RESEND_API_KEY,RESEND_FROM&install-command=pnpm%20install&build-command=pnpm%20run%20build&root-directory=apps%2Fnextjs)

## 📦 项目结构

```
videofly/
├── apps/
│   └── nextjs/                 # 主应用
├── packages/
│   ├── video-generator/        # AI 视频生成组件
│   ├── ui/                     # UI 组件库
│   ├── api/                    # tRPC API 层
│   ├── auth/                   # 认证模块
│   ├── db/                     # 数据库模块
│   ├── common/                 # 公共工具
│   └── stripe/                 # 支付模块
└── tooling/                    # 工具配置
```

## 🎯 使用 video-generator 组件

```tsx
import { VideoGeneratorInput } from "@videofly/video-generator";

export default function Page() {
  return (
    <VideoGeneratorInput
      isPro={false}
      locale="zh"
      onSubmit={(data) => {
        console.log("生成参数:", data);
        // data 包含: type, prompt, model, mode, aspectRatio, duration, resolution 等
      }}
    />
  );
}
```

### 自定义配置

```tsx
import {
  VideoGeneratorInput,
  DEFAULT_VIDEO_MODELS,
  mergeConfig
} from "@videofly/video-generator";

// 自定义模型列表
const customConfig = mergeConfig({
  videoModels: DEFAULT_VIDEO_MODELS.filter(m => m.id !== "sora-2"),
});

<VideoGeneratorInput config={customConfig} onSubmit={handleSubmit} />
```

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 认证 | Better Auth |
| 数据库 | PostgreSQL + Prisma + Kysely |
| API | tRPC + React Query |
| 样式 | Tailwind CSS + Shadcn/ui |
| 支付 | Stripe |
| 邮件 | React Email + Resend |
| 构建 | Turborepo + pnpm |

## 📝 环境变量

```bash
# 数据库
POSTGRES_URL='your-postgres-url'

# 认证
BETTER_AUTH_SECRET='your-secret'
GITHUB_CLIENT_ID='your-github-client-id'
GITHUB_CLIENT_SECRET='your-github-client-secret'

# 支付
STRIPE_API_KEY='your-stripe-key'
STRIPE_WEBHOOK_SECRET='your-webhook-secret'

# 邮件
RESEND_API_KEY='your-resend-key'
RESEND_FROM='noreply@yourdomain.com'

# 应用
NEXT_PUBLIC_APP_URL='http://localhost:3000'
```

## 🗺 路线图

- [x] AI 视频生成输入组件
- [x] 多模型支持
- [x] 中英文国际化
- [ ] 视频生成 API 集成
- [ ] 用户积分系统
- [ ] 生成历史记录
- [ ] 视频预览播放器

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🙏 致谢

本项目基于 **[Saasfly](https://github.com/saasfly/saasfly)** 开发，Saasfly 是由 [Nextify](https://nextify.ltd) 团队创建的企业级 Next.js 模板，采用 [MIT 许可证](https://github.com/saasfly/saasfly/blob/main/LICENSE) 开源。

感谢 Saasfly 团队提供如此优秀的开源基础设施。

**Saasfly 原始致谢：**
- [shadcn/Taxonomy](https://github.com/shadcn-ui/taxonomy)
- [t3-oss/create-t3-turbo](https://github.com/t3-oss/create-t3-turbo)
