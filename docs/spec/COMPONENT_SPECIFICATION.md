# VideoFly 组件规范文档

> 最后更新: 2026-01-16

## 一、组件目录结构

```
src/components/
├── ui/                       # shadcn/ui 基础组件 (55)
├── magicui/                  # Magic UI 动画组件 (4)
├── animate-ui/               # Animate UI 数字动画组件 (2)
├── video-generator/          # 视频生成业务组件 (3)
├── price/                    # 定价业务组件 (5)
├── k8s/                      # K8s 集群业务组件 (4)
├── docs/                     # 文档页面组件 (4)
├── blog/                     # 博客业务组件 (1)
├── content/                  # MDX 内容组件 (3)
└── (根目录)                   # 通用业务组件 (33)

总计: 114 个组件
```

---

## 二、组件完整清单

### 2.1 UI 基础组件 (`/src/components/ui/`)

共 55 个组件，包含 shadcn/ui 基础组件和内置动画效果组件。

#### 表单组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| Button | `button.tsx` | 按钮 | CVA |
| Input | `input.tsx` | 输入框 | - |
| Label | `label.tsx` | 标签 | Radix UI |
| Checkbox | `checkbox.tsx` | 复选框 | Radix UI |
| Switch | `switch.tsx` | 开关 | Radix UI |
| Select | `select.tsx` | 下拉选择 | Radix UI |
| Slider | `slider.tsx` | 滑块 | Radix UI |
| RadioGroup | `radio-group.tsx` | 单选组 | Radix UI |
| Calendar | `calendar.tsx` | 日历选择器 | react-day-picker |
| Form | `form.tsx` | 表单组件 | react-hook-form |

#### 弹窗/浮层组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| Dialog | `dialog.tsx` | 对话框 | Radix UI |
| AlertDialog | `alert-dialog.tsx` | 确认对话框 | Radix UI |
| Sheet | `sheet.tsx` | 侧边抽屉 | Radix UI |
| Drawer | `drawer.tsx` | 底部抽屉 | vaul |
| Popover | `popover.tsx` | 弹出层 | Radix UI |
| DropdownMenu | `dropdown-menu.tsx` | 下拉菜单 | Radix UI |
| Tooltip | `tooltip.tsx` | 工具提示 | Radix UI |
| Command | `command.tsx` | 命令面板 | cmdk |

#### 展示组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| Card | `card.tsx` | 卡片容器 | - |
| Table | `table.tsx` | 表格 | - |
| DataTable | `data-table.tsx` | 数据表格 | TanStack Table |
| Tabs | `tabs.tsx` | 标签页 | Radix UI |
| Accordion | `accordion.tsx` | 折叠面板 | Radix UI |
| Avatar | `avatar.tsx` | 用户头像 | Radix UI |
| Badge | `badge.tsx` | 状态标签 | CVA |
| Skeleton | `skeleton.tsx` | 骨架屏 | - |
| CardSkeleton | `card-skeleton.tsx` | 卡片骨架屏 | - |
| ScrollArea | `scroll-area.tsx` | 滚动区域 | Radix UI |
| Separator | `separator.tsx` | 分隔线 | Radix UI |

#### 反馈组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| Sonner | `sonner.tsx` | Toast 通知 | sonner |
| Alert | `alert.tsx` | 警告提示 | - |
| Callout | `callout.tsx` | 提示框 | - |
| Progress | `progress.tsx` | 进度条 | Radix UI |
| Spinner | `spinner.tsx` | 加载指示器 | Lucide |

#### 导航组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| Breadcrumb | `breadcrumb.tsx` | 面包屑导航 | - |
| Pagination | `pagination.tsx` | 分页组件 | - |

#### 工具组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| Icons | `icons.tsx` | 图标集合 | Lucide React |

#### 动画效果组件
| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| 3DCard | `3d-card.tsx` | 3D 卡片效果 | - |
| AnimatedGradientText | `animated-gradient-text.tsx` | 渐变文字动画 | - |
| AnimatedList | `animated-list.tsx` | 列表动画 | Framer Motion |
| AnimatedTooltip | `animated-tooltip.tsx` | 动画提示 | Framer Motion |
| BackgroundLines | `background-lines.tsx` | 背景线条 | - |
| CardHoverEffect | `card-hover-effect.tsx` | 卡片悬停效果 | Framer Motion |
| ColorfulText | `colorful-text.tsx` | 彩色文字 | Framer Motion |
| ContainerScrollAnimation | `container-scroll-animation.tsx` | 滚动动画容器 | Framer Motion |
| FollowingPointer | `following-pointer.tsx` | 跟随鼠标效果 | Framer Motion |
| GlowingEffect | `glowing-effect.tsx` | 发光效果 | - |
| InfiniteMovingCards | `infinite-moving-cards.tsx` | 无限滚动卡片 | - |
| Marquee | `marquee.tsx` | 跑马灯 | - |
| Meteors | `meteors.tsx` | 流星效果 | - |
| Sparkles | `sparkles.tsx` | 闪光效果 | tsparticles |
| TextGenerateEffect | `text-generate-effect.tsx` | 文字生成动画 | Framer Motion |
| TextReveal | `text-reveal.tsx` | 文字揭示动画 | Framer Motion |
| TypewriterEffect | `typewriter-effect.tsx` | 打字机效果 | Framer Motion |
| WobbleCard | `wobble-card.tsx` | 摇摆卡片 | Framer Motion |

### 2.2 Magic UI 组件 (`/src/components/magicui/`)

共 4 个组件，适合 AI 视频产品展示的特效组件。

| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| BlurFade | `blur-fade.tsx` | 模糊淡入动画 | Framer Motion |
| BorderBeam | `border-beam.tsx` | 边框光束动画 | - |
| Confetti | `confetti.tsx` | 庆祝烟花效果 | canvas-confetti |
| HeroVideoDialog | `hero-video-dialog.tsx` | 视频预览对话框 | Framer Motion |

### 2.3 Animate UI 组件 (`/src/components/animate-ui/`)

共 2 个组件，现代数字动画组件。

| 组件 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| CountingNumber | `counting-number.tsx` | 数字计数动画 | Framer Motion |
| SlidingNumber | `sliding-number.tsx` | 数字滑动动画 | Framer Motion |

### 2.4 视频生成组件 (`/src/components/video-generator/`)

共 3 个组件，核心业务模块。

| 组件 | 文件 | 用途 |
|------|------|------|
| VideoGeneratorInput | `video-generator-input.tsx` | 视频生成输入表单 |
| VideoStatusCard | `video-status-card.tsx` | 视频生成状态卡片 |
| VideoCard | `video-card.tsx` | 视频展示卡片 |

**类型定义**: `types.ts`
**导出入口**: `index.ts`

### 2.5 定价组件 (`/src/components/price/`)

共 5 个组件。

| 组件 | 文件 | 用途 |
|------|------|------|
| BillingFormButton | `billing-form-button.tsx` | 账单表单按钮 |
| CreemPricing | `creem-pricing.tsx` | Creem 定价页面 |
| CreemSubscriptionCard | `creem-subscription-card.tsx` | 订阅卡片 |
| PricingCards | `pricing-cards.tsx` | 定价卡片 |
| PricingFaq | `pricing-faq.tsx` | 定价常见问题 |

### 2.6 K8s 集群组件 (`/src/components/k8s/`)

共 4 个组件。

| 组件 | 文件 | 用途 |
|------|------|------|
| ClusterConfig | `cluster-config.tsx` | 集群配置 |
| ClusterCreateButton | `cluster-create-button.tsx` | 创建集群按钮 |
| ClusterItem | `cluster-item.tsx` | 集群列表项 |
| ClusterOperations | `cluster-operation.tsx` | 集群操作菜单 |

### 2.7 文档组件 (`/src/components/docs/`)

共 4 个组件。

| 组件 | 文件 | 用途 |
|------|------|------|
| PageHeader | `page-header.tsx` | 页面头部 |
| Pager | `pager.tsx` | 分页导航 |
| Search | `search.tsx` | 搜索组件 |
| SidebarNav | `sidebar-nav.tsx` | 侧边导航 |

### 2.8 博客组件 (`/src/components/blog/`)

共 1 个组件。

| 组件 | 文件 | 用途 |
|------|------|------|
| BlogPosts | `blog-posts.tsx` | 博客文章列表 |

### 2.9 内容组件 (`/src/components/content/`)

共 3 个组件。

| 组件 | 文件 | 用途 |
|------|------|------|
| MdxCard | `mdx-card.tsx` | MDX 卡片 |
| MdxComponents | `mdx-components.tsx` | MDX 组件映射 |
| Toc | `toc.tsx` | 目录组件 |

### 2.10 通用业务组件 (`/src/components/`)

共 33 个组件，放置在根目录的跨业务通用组件。

#### 布局组件
| 组件 | 文件 | 用途 |
|------|------|------|
| Header | `header.tsx` | 页面头部 |
| Navbar | `navbar.tsx` | 导航栏 |
| MainNav | `main-nav.tsx` | 主导航 |
| MobileNav | `mobile-nav.tsx` | 移动端导航 |
| Nav | `nav.tsx` | 导航组件 |
| SiteFooter | `site-footer.tsx` | 网站页脚 |
| Shell | `shell.tsx` | 页面外壳 |

#### 用户相关组件
| 组件 | 文件 | 用途 |
|------|------|------|
| UserAccountNav | `user-account-nav.tsx` | 用户账户导航 |
| UserAuthForm | `user-auth-form.tsx` | 用户认证表单 |
| UserAvatar | `user-avatar.tsx` | 用户头像 |
| UserNameForm | `user-name-form.tsx` | 用户名表单 |
| SignInModal | `sign-in-modal.tsx` | 登录模态框 |

#### 功能组件
| 组件 | 文件 | 用途 |
|------|------|------|
| BillingForm | `billing-form.tsx` | 账单表单 |
| LocaleChange | `locale-change.tsx` | 语言切换 |
| ThemeToggle | `theme-toggle.tsx` | 主题切换 |
| ThemeProvider | `theme-provider.tsx` | 主题提供者 |
| ModeToggle | `mode-toggle.tsx` | 模式切换 |
| Modal | `modal.tsx` | 模态框 |
| ModalProvider | `modal-provider.tsx` | 模态框提供者 |
| CodeCopy | `code-copy.tsx` | 代码复制 |
| Comments | `comments.tsx` | 评论组件 |

#### 展示组件
| 组件 | 文件 | 用途 |
|------|------|------|
| BaseItem | `base-item.tsx` | 基础列表项 |
| BlogCard | `blog-card.tsx` | 博客卡片 |
| EmptyPlaceholder | `empty-placeholder.tsx` | 空状态占位 |
| FeaturesCard | `features-card.tsx` | 功能特性卡片 |
| FeaturesGrid | `features-grid.tsx` | 功能特性网格 |
| GithubStar | `github-star.tsx` | GitHub 星标 |
| MeteorsCard | `meteors-card.tsx` | 流星效果卡片 |
| DocumentGuide | `document-guide.tsx` | 文档指南 |
| Questions | `questions.tsx` | 常见问题 |
| RightsideMarketing | `rightside-marketing.tsx` | 右侧营销 |
| VideoScroll | `video-scroll.tsx` | 视频滚动 |

#### 开发工具组件
| 组件 | 文件 | 用途 |
|------|------|------|
| TailwindIndicator | `tailwind-indicator.tsx` | Tailwind 断点指示器 |

---

## 三、组件使用规范

### 3.1 导入规范

```tsx
// UI 基础组件 - 从 @/components/ui 导入
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Toast 直接从 sonner 导入
import { toast } from "sonner";

// Magic UI 组件
import { BlurFade } from "@/components/magicui/blur-fade";
import { fireConfetti } from "@/components/magicui/confetti";

// Animate UI 组件
import { CountingNumber } from "@/components/animate-ui/counting-number";

// 业务组件 - 从各自目录导入
import { VideoGeneratorInput } from "@/components/video-generator";
import { ClusterOperations } from "@/components/k8s/cluster-operation";
import { CreemPricing } from "@/components/price/creem-pricing";

// 通用业务组件 - 从根目录导入
import { DashboardHeader } from "@/components/header";
import { DashboardShell } from "@/components/shell";
```

### 3.2 Toast 使用规范

项目使用 **Sonner** 作为 Toast 通知系统。

```tsx
import { toast } from "sonner";

// 成功通知
toast.success("Success", {
  description: "Operation completed successfully!",
});

// 错误通知
toast.error("Error", {
  description: "Something went wrong.",
});

// 信息通知
toast.info("Info", {
  description: "Here's some information.",
});

// 警告通知
toast.warning("Warning", {
  description: "Please be careful.",
});

// Promise 通知（加载状态）
toast.promise(asyncFunction(), {
  loading: "Loading...",
  success: "Done!",
  error: "Failed!",
});
```

### 3.3 图标使用规范

```tsx
// 从统一的 icons 文件导入
import * as Icons from "@/components/ui/icons";

// 使用示例
<Icons.Spinner className="h-4 w-4 animate-spin" />
<Icons.Check className="h-4 w-4" />
<Icons.X className="h-4 w-4" />
<Icons.Ellipsis className="h-4 w-4" />
<Icons.Trash className="h-4 w-4" />
<Icons.Add className="h-4 w-4" />
```

### 3.4 样式工具函数

```tsx
// cn 函数用于合并 Tailwind 类名
import { cn } from "@/components/ui";

// 使用示例
<div className={cn(
  "base-classes",
  conditionalClass && "conditional-class",
  className
)}>
```

---

## 四、新增组件使用指南

### 4.1 Progress 进度条

```tsx
import { Progress } from "@/components/ui/progress";

<Progress value={33} />
<Progress value={75} className="h-2" />
```

### 4.2 Badge 徽章

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
```

### 4.3 Tooltip 工具提示

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>
      <p>Tooltip content</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 4.4 Slider 滑块

```tsx
import { Slider } from "@/components/ui/slider";

<Slider
  defaultValue={[50]}
  max={100}
  step={1}
  onValueChange={(value) => console.log(value)}
/>
```

### 4.5 RadioGroup 单选组

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

<RadioGroup defaultValue="option-one">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option-one" id="option-one" />
    <Label htmlFor="option-one">Option One</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option-two" id="option-two" />
    <Label htmlFor="option-two">Option Two</Label>
  </div>
</RadioGroup>
```

### 4.6 Drawer 抽屉

```tsx
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

<Drawer>
  <DrawerTrigger>Open</DrawerTrigger>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Title</DrawerTitle>
      <DrawerDescription>Description</DrawerDescription>
    </DrawerHeader>
    <DrawerFooter>
      <Button>Submit</Button>
      <DrawerClose>Cancel</DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### 4.7 Breadcrumb 面包屑

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 4.8 Spinner 加载指示器

```tsx
import { Spinner } from "@/components/ui/spinner";

<Spinner size="sm" />
<Spinner size="default" />
<Spinner size="lg" />

// 在按钮中使用
<Button disabled={isLoading}>
  {isLoading && <Spinner size="sm" className="mr-2" />}
  Submit
</Button>
```

### 4.9 Pagination 分页

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

### 4.10 BlurFade 模糊淡入

```tsx
import { BlurFade } from "@/components/magicui/blur-fade";

<BlurFade delay={0.25} inView>
  <h2>Animated Content</h2>
</BlurFade>
```

### 4.11 Confetti 庆祝效果

```tsx
import { fireConfetti, fireSideConfetti, fireStarsConfetti } from "@/components/magicui/confetti";

<Button onClick={fireConfetti}>Celebrate!</Button>
<Button onClick={fireSideConfetti}>Side Confetti</Button>
<Button onClick={fireStarsConfetti}>Stars!</Button>
```

### 4.12 HeroVideoDialog 视频预览

```tsx
import { HeroVideoDialog } from "@/components/magicui/hero-video-dialog";

<HeroVideoDialog
  videoSrc="https://example.com/video.mp4"
  thumbnailSrc="/thumbnail.jpg"
  thumbnailAlt="Video thumbnail"
/>
```

### 4.13 CountingNumber 数字计数

```tsx
import { CountingNumber } from "@/components/animate-ui/counting-number";

<CountingNumber
  value={1000}
  duration={2}
  formatOptions={{ style: "currency", currency: "USD" }}
/>
```

### 4.14 SlidingNumber 数字滑动

```tsx
import { SlidingNumber } from "@/components/animate-ui/sliding-number";

<SlidingNumber value={credits} />
```

---

## 五、组件目录规范

### 5.1 目录分类原则

| 目录 | 内容 | 示例 |
|------|------|------|
| `ui/` | shadcn/ui 基础组件 + 通用动画组件 | button, card, progress, marquee |
| `magicui/` | Magic UI 特效组件 | confetti, blur-fade, hero-video-dialog |
| `animate-ui/` | Animate UI 数字动画组件 | counting-number, sliding-number |
| `video-generator/` | 视频生成业务组件 | video-generator-input, video-card |
| `price/` | 定价相关业务组件 | creem-pricing, pricing-cards |
| `k8s/` | K8s 集群业务组件 | cluster-config, cluster-operation |
| `docs/` | 文档页面组件 | sidebar-nav, search |
| `blog/` | 博客业务组件 | blog-posts |
| `content/` | MDX 内容组件 | mdx-components, toc |
| 根目录 | 跨业务通用组件 | header, footer, navbar, shell |

### 5.2 命名规范

- **文件名**: 使用 kebab-case（如 `video-card.tsx`）
- **组件名**: 使用 PascalCase（如 `VideoCard`）
- **类型文件**: 使用 `types.ts`
- **索引文件**: 使用 `index.ts`
- **工具函数**: 放在 `utils/` 子目录

### 5.3 业务模块结构

对于复杂的业务模块，建议采用以下结构：

```
src/components/[module-name]/
├── index.ts              # 导出入口
├── types.ts              # 类型定义
├── [component-1].tsx     # 组件文件
├── [component-2].tsx
└── utils/                # 模块专用工具函数（可选）
```

示例：`video-generator/` 模块

```
video-generator/
├── index.ts              # 导出 VideoGeneratorInput, VideoStatusCard, VideoCard
├── types.ts              # GenerationType, VideoModel, SubmitData 类型
├── video-generator-input.tsx
├── video-status-card.tsx
└── video-card.tsx
```

---

## 六、技术栈参考

### 6.1 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| Next.js | 15 | 全栈框架 |
| Tailwind CSS | 4.0.14 | 样式框架 |
| Radix UI | next | 无障碍基础组件 |
| Framer Motion | 12.26.2 | 动画库 |
| Lucide React | latest | 图标库 |
| sonner | latest | Toast 通知 |
| vaul | latest | Drawer 组件 |
| canvas-confetti | latest | 庆祝动画 |
| class-variance-authority | latest | 组件变体管理 |

### 6.2 Biome 忽略配置

以下目录已添加到 Biome 忽略列表：

```json
{
  "files": {
    "ignore": [
      "src/components/ui/**",
      "src/components/magicui/**",
      "src/components/animate-ui/**"
    ]
  }
}
```

---

## 七、组件统计

| 分类 | 数量 |
|------|------|
| UI 基础组件 | 55 |
| Magic UI 组件 | 4 |
| Animate UI 组件 | 2 |
| 视频生成组件 | 3 |
| 定价组件 | 5 |
| K8s 组件 | 4 |
| 文档组件 | 4 |
| 博客组件 | 1 |
| 内容组件 | 3 |
| 通用业务组件 | 33 |
| **总计** | **114** |

---

## 八、相关文档

- [组件集成规划方案](./COMPONENT_INTEGRATION_PLAN.md) - 组件选型和集成计划
- [技术架构文档](../TECHNICAL_ARCHITECTURE.md) - 项目整体技术架构
- [UI 导航架构](../UI_NAVIGATION_ARCHITECTURE.md) - 导航和页面结构

---

## 九、更新日志

### 2026-01-16
- 新增 Progress, Badge, Tooltip, Spinner, Slider, RadioGroup, Separator 基础组件
- 新增 Breadcrumb, Drawer, Pagination 增强组件
- 新增 Sonner Toast 系统，删除旧的 toast/toaster/use-toast
- 新增 Magic UI 组件目录 (blur-fade, border-beam, confetti, hero-video-dialog)
- 新增 Animate UI 组件目录 (counting-number, sliding-number)
- 更新 biome.json 忽略配置
- 更新 tailwind.config.ts 添加 border-beam 动画
- 将规范文档移至 /docs/spec/ 目录
