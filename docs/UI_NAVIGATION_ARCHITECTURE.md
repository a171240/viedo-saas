# VideoFly UI 导航架构与页面方案 V3

## 一、整体布局

### 1.1 页面类型

| 类型   | 布局            | 说明                   |
| ------ | --------------- | ---------------------- |
| 落地页 | 顶部导航 + 内容 | 首页、模型页、价格页等 |
| 工具页 | 三栏布局        | 生成工具核心页面       |
| 管理页 | 左侧导航 + 内容 | 创作历史、账户设置等   |

### 1.2 三栏布局结构 (工具页面)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  顶部栏: Logo | ─────────────────────────────────── | 💎 739 | [👤 ▼]       │
├────────────┬─────────────────────────┬───────────────────────────────────────┤
│            │                         │                                       │
│  左侧导航   │     生成组件面板         │      结果区 / 内容区                   │
│  (固定宽度) │     (固定宽度 ~400px)   │      (自适应宽度)                      │
│            │                         │                                       │
│  VIDEO     │  - 模型选择              │  已登录: 当前生成结果                  │
│  - Img2Vid │  - 图片上传              │  未登录: 营销内容 + 示例               │
│  - Txt2Vid │  - Prompt               │                                       │
│  - Ref2Vid │  - 参数设置              │                                       │
│  ───       │  - Create 按钮          │                                       │
│  My        │                         │                                       │
│  Creations │                         │                                       │
│  ───       │                         │                                       │
│  Credits   │                         │                                       │
│  Settings  │                         │                                       │
│            │                         │                                       │
└────────────┴─────────────────────────┴───────────────────────────────────────┘
```

---

## 二、页面路由规划

### 2.1 路由命名规范

| 规则       | 说明                 | 示例              |
| ---------- | -------------------- | ----------------- |
| 小写字母   | 路由全部小写         | `/image-to-video` |
| 短横线分隔 | 多单词用 `-` 连接    | `/my-creations`   |
| 语义化     | 路由名称反映页面功能 | `/pricing`        |
| 无前缀     | 不使用 `/app` 等前缀 | `/settings`       |

### 2.2 落地页 (Landing Pages)

用于品牌展示、SEO 引流,使用顶部导航布局。

| 路由       | 页面     | 说明                    | 路由组      |
| ---------- | -------- | ----------------------- | ----------- |
| `/`        | 首页     | 品牌展示、功能介绍、CTA | `(landing)` |
| `/pricing` | 定价页   | 套餐对比、购买入口      | `(landing)` |
| `/privacy` | 隐私政策 | 法律文档                | `(landing)` |
| `/terms`   | 服务条款 | 法律文档                | `(landing)` |
|            |          |                         |             |

### 2.3 模型落地页 (Model Pages)

**用途**: 专为 SEO 服务,供搜索引擎检索,不在应用导航中展示。

| 路由            | 模型         | 说明                 | 路由组      |
| --------------- | ------------ | -------------------- | ----------- |
| `/sora-2`       | Sora 2       | OpenAI Sora 模型介绍 | `(landing)` |
| `/veo-3-1`      | Veo 3.1      | Google Veo 模型介绍  | `(landing)` |
| `/seedance-1-5` | Seedance 1.5 | ByteDance 模型介绍   | `(landing)` |
| `/wan-2-6`      | Wan 2.6      | 阿里 Wan 模型介绍    | `(landing)` |

**页面内容:**

- Hero 区域 (模型介绍 + CTA 跳转工具页)
- 功能特点
- 示例视频展示
- 参数说明
- FAQ

**扩展规范**: 新增模型时,路由格式为 `/模型名-版本号`,如 `/kling-2-0`

### 2.4 工具页 (Tool Pages)

核心功能页面,使用三栏布局。

| 路由                  | 名称               | 说明         | 路由组   |
| --------------------- | ------------------ | ------------ | -------- |
| `/image-to-video`     | Image to Video     | 图生视频     | `(tool)` |
| `/text-to-video`      | Text to Video      | 文生视频     | `(tool)` |
| `/reference-to-video` | Reference to Video | 参考视频生成 | `(tool)` |

**扩展规范**: 新增工具时,路由格式为 `/输入类型-to-输出类型`,如 `/video-to-video`

### 2.5 用户功能页 (User Pages)

需要登录的用户管理页面,使用左侧导航布局。

| 路由            | 名称     | 说明                       | 路由组        |
| --------------- | -------- | -------------------------- | ------------- |
| `/my-creations` | 我的创作 | 历史生成记录               | `(dashboard)` |
| `/credits`      | 积分     | 余额 + 购买 + 消费历史     | `(dashboard)` |
| `/settings`     | 设置     | 个人信息 + 账户设置 + 账单 | `(dashboard)` |

### 2.6 认证页 (Auth Pages)

| 路由     | 页面      | 说明               | 路由组   |
| -------- | --------- | ------------------ | -------- |
| `/login` | 登录/注册 | 登录注册一体化页面 | `(auth)` |

---

## 三、顶部导航设计

### 3.1 落地页顶部导航

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🎬 VideoFly     [Models ▼]  [Tools ▼]  Pricing     ────────     [Login]      │
└────────────────────────────────────────────────────────────────────────────────┘
```

**已登录:**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🎬 VideoFly     [Models ▼]  [Tools ▼]  Pricing     ────────     💎 739 [👤 ▼]│
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 工具页/管理页顶部导航 (简化版)

工具页和管理页的顶部导航只保留右侧个人相关内容:

**未登录:**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🎬 VideoFly                                        ────────────────  [Login] │
└────────────────────────────────────────────────────────────────────────────────┘
```

**已登录:**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🎬 VideoFly                                        ──────────  💎 739  [👤 ▼]│
└────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Models 下拉菜单 (仅落地页)

```
┌─────────────────────────┐
│  🎬 Sora 2              │
│     by OpenAI           │
├─────────────────────────┤
│  🎬 Veo 3.1             │
│     by Google           │
├─────────────────────────┤
│  🎬 Seedance 1.5        │
│     by ByteDance        │
├─────────────────────────┤
│  🎬 Wan 2.6             │
│     by Alibaba          │
└─────────────────────────┘
```

### 3.4 Tools 下拉菜单 (仅落地页)

```
┌─────────────────────────┐
│  📸 Image to Video      │
│  📝 Text to Video       │
│  🎬 Reference to Video  │
└─────────────────────────┘
```

### 3.5 用户菜单 (已登录)

```
┌─────────────────────────┐
│  Language          >    │
├─────────────────────────┤
│  My Creations           │
│  Credits                │
│  Settings               │
├─────────────────────────┤
│  Logout                 │
└─────────────────────────┘
```

---

## 四、左侧导航设计

### 4.1 导航结构 (固定宽度,始终展示文字)

```
┌──────────────────────┐
│  VIDEO               │  <- 分组标题
│  ├─ Image to Video   │
│  ├─ Text to Video    │
│  └─ Reference Video  │
├──────────────────────┤
│  ────────────────    │  <- 分隔线
│  📁 My Creations     │
├──────────────────────┤
│  💎 Credits          │
│  ⚙️ Settings         │
└──────────────────────┘
```

### 4.2 未来扩展示例

```
┌──────────────────────┐
│  VIDEO               │
│  ├─ Image to Video   │
│  ├─ Text to Video    │
│  └─ Reference Video  │
├──────────────────────┤
│  IMAGE               │  <- 未来扩展
│  ├─ Text to Image    │
│  └─ Image to Image   │
├──────────────────────┤
│  ────────────────    │
│  📁 My Creations     │
├──────────────────────┤
│  💎 Credits          │
│  ⚙️ Settings         │
└──────────────────────┘
```

### 4.3 导航配置

```typescript
// src/config/navigation.ts

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon?: string;         // Lucide icon 名称
  badge?: string;        // "New", "Beta"
  requiresAuth?: boolean;
}

export interface NavGroup {
  id: string;
  title?: string;        // 分组标题,可选
  items: NavItem[];
}

export const sidebarNavigation: NavGroup[] = [
  {
    id: "video",
    title: "VIDEO",
    items: [
      { id: "img2vid", title: "Image to Video", href: "/image-to-video", icon: "ImagePlay" },
      { id: "txt2vid", title: "Text to Video", href: "/text-to-video", icon: "Type" },
      { id: "ref2vid", title: "Reference Video", href: "/reference-to-video", icon: "Video" },
    ]
  },
  // 未来扩展: IMAGE 分组
  // {
  //   id: "image",
  //   title: "IMAGE",
  //   items: [
  //     { id: "txt2img", title: "Text to Image", href: "/text-to-image", icon: "Image" },
  //   ]
  // },
  {
    id: "user",
    items: [
      { id: "creations", title: "My Creations", href: "/my-creations", icon: "FolderOpen", requiresAuth: true },
    ]
  },
  {
    id: "account",
    items: [
      { id: "credits", title: "Credits", href: "/credits", icon: "Gem" },
      { id: "settings", title: "Settings", href: "/settings", icon: "Settings", requiresAuth: true },
    ]
  }
];

// 落地页顶部导航 - Models 下拉
export const headerModels = [
  { id: "sora", title: "Sora 2", subtitle: "by OpenAI", href: "/sora-2" },
  { id: "veo", title: "Veo 3.1", subtitle: "by Google", href: "/veo-3-1" },
  { id: "seedance", title: "Seedance 1.5", subtitle: "by ByteDance", href: "/seedance-1-5" },
  { id: "wan", title: "Wan 2.6", subtitle: "by Alibaba", href: "/wan-2-6" },
];

// 落地页顶部导航 - Tools 下拉
export const headerTools = [
  { id: "img2vid", title: "Image to Video", href: "/image-to-video", icon: "ImagePlay" },
  { id: "txt2vid", title: "Text to Video", href: "/text-to-video", icon: "Type" },
  { id: "ref2vid", title: "Reference to Video", href: "/reference-to-video", icon: "Video" },
];
```

---

## 五、工具页面布局

### 5.1 三栏布局详细设计

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  顶部栏 (h-16, 64px)                                                                 │
├────────────┬──────────────────────────────┬──────────────────────────────────────────┤
│            │                              │                                          │
│  左侧导航   │      生成组件面板             │         结果区 / 内容区                   │
│  w-[200px] │      w-[400px]               │         flex-1 (min-w-[400px])           │
│            │                              │                                          │
│  固定定位   │      overflow-y-auto         │         overflow-y-auto                  │
│            │                              │                                          │
└────────────┴──────────────────────────────┴──────────────────────────────────────────┘
```

### 5.2 生成组件面板 (第二栏)

```
┌──────────────────────────────┐
│  Image to Video              │  <- 页面标题
├──────────────────────────────┤
│  Model                       │
│  ┌────────────────────────┐  │
│  │ 🎬 Wan 2.6           ▼ │  │
│  └────────────────────────┘  │
├──────────────────────────────┤
│  Image                       │
│  ┌────────────────────────┐  │
│  │                        │  │
│  │    Click to upload     │  │
│  │    or drag & drop      │  │
│  │                        │  │
│  └────────────────────────┘  │
│  JPG, PNG, WEBP (max 10MB)   │
├──────────────────────────────┤
│  Prompt                      │
│  ┌────────────────────────┐  │
│  │ Describe your video... │  │
│  │                        │  │
│  │                        │  │
│  └────────────────────────┘  │
│                       0/2000 │
├──────────────────────────────┤
│  Duration                    │
│  ○ 5s   ● 10s   ○ 15s       │
├──────────────────────────────┤
│  Aspect Ratio                │
│  ○ 16:9  ● 9:16  ○ 1:1      │
├──────────────────────────────┤
│  Credits required: 24        │
│  ┌────────────────────────┐  │
│  │     ✨ Generate        │  │  <- 主按钮
│  └────────────────────────┘  │
└──────────────────────────────┘
```

### 5.3 结果区 - 已登录状态

只显示当前生成的结果,历史记录去 My Creations 查看:

**生成完成:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                     ┌───────────────────────────────┐                   │
│                     │                               │                   │
│                     │      [Video Player]           │                   │
│                     │           ▶                   │                   │
│                     │                               │                   │
│                     └───────────────────────────────┘                   │
│                                                                         │
│                     Model: Wan 2.6 | Duration: 10s                      │
│                     ───────────────────────────────────                 │
│                     "A girl walking on the beach..."                    │
│                                                                         │
│                     [⬇️ Download]  [🔄 Regenerate]                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**生成中:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                     ┌───────────────────────────────┐                   │
│                     │                               │                   │
│                     │      [Thumbnail/Preview]      │                   │
│                     │                               │                   │
│                     │         ● 45%                 │                   │
│                     │                               │                   │
│                     └───────────────────────────────┘                   │
│                                                                         │
│                     Generating your video...                            │
│                     This may take 2-5 minutes                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**空状态:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                              🎬                                         │
│                                                                         │
│                     Your creation will appear here                      │
│                                                                         │
│                     Upload an image and describe                        │
│                     what you want to create                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.4 结果区 - 未登录状态 (内容区)

展示营销内容和示例:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│         Transform Your Images into Stunning Videos                      │
│                                                                         │
│         Powered by the latest AI models: Sora 2, Veo 3.1,              │
│         Seedance 1.5, and Wan 2.6                                      │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │                 │  │                 │  │                 │         │
│  │  [Example 1]    │  │  [Example 2]    │  │  [Example 3]    │         │
│  │                 │  │                 │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│         ✨ Features:                                                    │
│         • Multiple AI models to choose from                             │
│         • High quality 1080p output                                     │
│         • Fast generation (2-5 minutes)                                 │
│                                                                         │
│         ┌─────────────────────────────────┐                             │
│         │      Login to get started       │                             │
│         │      Get 50 free credits        │                             │
│         └─────────────────────────────────┘                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 六、用户功能页面

### 6.1 My Creations 页面

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  顶部栏 (简化版)                                                              │
├────────────┬─────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  左侧导航   │  My Creations                              [All ▼] [Select]    │
│            │  ───────────────────────────────────────────────────────────── │
│            │                                                                 │
│            │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│            │  │         │  │         │  │         │  │         │           │
│            │  │         │  │         │  │         │  │         │           │
│            │  │         │  │         │  │         │  │         │           │
│            │  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│            │  Jan 15       Jan 15       Jan 14       Jan 14                 │
│            │                                                                 │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

**视频卡片:**

```
┌───────────────────────┐
│  ┌─────────────────┐  │
│  │                 │  │
│  │  [Thumbnail]    │  │
│  │       ▶        │  │
│  │                 │  │
│  │     00:10      │  │  <- 时长
│  └─────────────────┘  │
│  Wan 2.6 | 9:16       │  <- 模型 | 比例
│  Jan 15, 2025         │  <- 日期
│  [⬇️] [🗑️]             │  <- 下载 | 删除
└───────────────────────┘
```

**筛选:**

```
[All ▼]
- All
- Completed
- Processing
- Failed
```

### 6.2 Credits 页面

收敛设计: 余额 + 购买 + 历史

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  顶部栏 (简化版)                                                              │
├────────────┬─────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  左侧导航   │  Credits                                                        │
│            │  ───────────────────────────────────────────────────────────── │
│            │                                                                 │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │  💎 Current Balance                                     │   │
│            │  │      739 Credits                                        │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            │  Buy Credits                                                    │
│            │  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│            │  │  100      │  │  500      │  │  1000     │                   │
│            │  │  $9.99    │  │  $39.99   │  │  $69.99   │                   │
│            │  └───────────┘  └───────────┘  └───────────┘                   │
│            │                                                                 │
│            │  Credit History                                                 │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │  Date        Type           Amount    Balance           │   │
│            │  │  Jan 15      Video Gen      -24       739               │   │
│            │  │  Jan 14      Purchase       +500      787               │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

### 6.3 Settings 页面

收敛设计: 个人信息 + 账户设置 + 账单

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  顶部栏 (简化版)                                                              │
├────────────┬─────────────────────────────────────────────────────────────────┤
│            │                                                                 │
│  左侧导航   │  Settings                                                       │
│            │  ───────────────────────────────────────────────────────────── │
│            │                                                                 │
│            │  [Profile]  [Account]  [Billing]    <- Tabs                    │
│            │                                                                 │
│            │  Profile:                                                       │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │  Avatar: [Upload]                                       │   │
│            │  │  Name: _______________                                  │   │
│            │  │  Email: user@example.com (verified)                     │   │
│            │  │                                    [Save Changes]       │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            │  Account:                                                       │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │  Language: [English ▼]                                  │   │
│            │  │  Change Password                                        │   │
│            │  │  Delete Account                                         │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
│            │  Billing:                                                       │
│            │  ┌─────────────────────────────────────────────────────────┐   │
│            │  │  Current Plan: Free                                     │   │
│            │  │  Payment Method: •••• 4242                              │   │
│            │  │  Billing History                                        │   │
│            │  └─────────────────────────────────────────────────────────┘   │
│            │                                                                 │
└────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 七、目录结构

```
src/
├── app/
│   ├── (landing)/                    # 落地页路由组 (顶部导航布局)
│   │   ├── layout.tsx                # 落地页布局 (含 Models/Tools 下拉)
│   │   ├── page.tsx                  # 首页 /
│   │   ├── pricing/
│   │   │   └── page.tsx              # /pricing
│   │   ├── privacy/
│   │   │   └── page.tsx              # /privacy
│   │   ├── terms/
│   │   │   └── page.tsx              # /terms
│   │   │
│   │   ├── sora-2/
│   │   │   └── page.tsx              # /sora-2 (SEO)
│   │   ├── veo-3-1/
│   │   │   └── page.tsx              # /veo-3-1 (SEO)
│   │   ├── seedance-1-5/
│   │   │   └── page.tsx              # /seedance-1-5 (SEO)
│   │   └── wan-2-6/
│   │       └── page.tsx              # /wan-2-6 (SEO)
│   │
│   ├── (tool)/                       # 工具页路由组 (三栏布局)
│   │   ├── layout.tsx                # 三栏布局 (简化顶部 + 左侧导航)
│   │   ├── image-to-video/
│   │   │   └── page.tsx              # /image-to-video
│   │   ├── text-to-video/
│   │   │   └── page.tsx              # /text-to-video
│   │   └── reference-to-video/
│   │       └── page.tsx              # /reference-to-video
│   │
│   ├── (dashboard)/                  # 管理页路由组 (左侧导航布局)
│   │   ├── layout.tsx                # 管理页布局 (简化顶部 + 左侧导航)
│   │   ├── my-creations/
│   │   │   └── page.tsx              # /my-creations
│   │   ├── credits/
│   │   │   └── page.tsx              # /credits
│   │   └── settings/
│   │       └── page.tsx              # /settings
│   │
│   ├── (auth)/                       # 认证页路由组
│   │   ├── layout.tsx
│   │   └── login/
│   │       └── page.tsx              # /login (登录注册一体)
│   │
│   ├── api/                          # API 路由
│   │   └── ...
│   │
│   └── layout.tsx                    # 根布局
│
├── components/
│   ├── layout/
│   │   ├── header.tsx                # 顶部导航 (完整版,落地页用)
│   │   ├── header-simple.tsx         # 顶部导航 (简化版,工具/管理页用)
│   │   ├── header-dropdown.tsx       # Models/Tools 下拉菜单
│   │   ├── sidebar.tsx               # 左侧导航
│   │   ├── sidebar-nav.tsx           # 导航项组件
│   │   ├── user-menu.tsx             # 用户下拉菜单
│   │   ├── tool-layout.tsx           # 三栏布局容器
│   │   └── dashboard-layout.tsx      # 管理页布局容器
│   │
│   ├── tool/
│   │   ├── generator-panel.tsx       # 生成组件面板 (第二栏)
│   │   ├── result-panel.tsx          # 结果区 (第三栏, 已登录)
│   │   ├── content-panel.tsx         # 内容区 (第三栏, 未登录)
│   │   ├── model-selector.tsx        # 模型选择器
│   │   ├── image-uploader.tsx        # 图片上传
│   │   ├── prompt-input.tsx          # Prompt 输入
│   │   └── generation-status.tsx     # 生成状态显示
│   │
│   ├── creation/
│   │   ├── creation-grid.tsx         # 创作列表网格
│   │   ├── creation-card.tsx         # 创作卡片
│   │   └── creation-filter.tsx       # 筛选器
│   │
│   ├── credits/
│   │   ├── balance-card.tsx          # 余额卡片
│   │   ├── credit-packages.tsx       # 积分套餐
│   │   └── credit-history.tsx        # 积分历史
│   │
│   ├── settings/
│   │   ├── profile-form.tsx          # 个人信息表单
│   │   ├── account-settings.tsx      # 账户设置
│   │   └── billing-info.tsx          # 账单信息
│   │
│   ├── landing/
│   │   ├── hero.tsx                  # Hero 区域
│   │   ├── features.tsx              # 功能介绍
│   │   ├── model-showcase.tsx        # 模型展示
│   │   └── pricing-cards.tsx         # 定价卡片
│   │
│   └── ui/                           # 基础 UI 组件 (已有)
│       └── ...
│
├── config/
│   ├── navigation.ts                 # 导航配置
│   ├── models.ts                     # 模型配置
│   └── site.ts                       # 站点配置
│
├── hooks/
│   ├── use-generation.ts             # 生成相关 Hook
│   └── use-credits.ts                # 积分相关 Hook
│
├── stores/
│   ├── generation-store.ts           # 生成状态
│   └── credits-store.ts              # 积分状态 (已有)
│
└── lib/
    └── ...
```

---

## 八、路由组说明

| 路由组        | 用途           | 布局特点                                |
| ------------- | -------------- | --------------------------------------- |
| `(landing)`   | 落地页、模型页 | 完整顶部导航 + 内容区                   |
| `(tool)`      | 工具页面       | 简化顶部 + 左侧导航 + 生成面板 + 结果区 |
| `(dashboard)` | 用户管理页     | 简化顶部 + 左侧导航 + 内容区            |
| `(auth)`      | 认证页面       | 居中卡片布局                            |

---

## 九、响应式设计

### 9.1 断点

| 断点 | 宽度       | 说明 |
| ---- | ---------- | ---- |
| `sm` | < 768px    | 手机 |
| `md` | 768-1024px | 平板 |
| `lg` | > 1024px   | 桌面 |

### 9.2 工具页面响应式

**桌面 (> 1024px):** 三栏布局

```
[导航 200px] [生成面板 400px] [结果区 flex-1]
```

**平板 (768-1024px):** 双栏布局

```
[生成面板 400px] [结果区 flex-1]
顶部: 汉堡菜单展开导航
```

**手机 (< 768px):** 单栏布局

```
Tab 切换: [生成] [结果]
顶部: 汉堡菜单
```

---

## 十、设计规范

### 10.1 配色

```css
:root {
  /* 背景 */
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-panel: #1a1a1a;

  /* 边框 */
  --border-default: #262626;
  --border-hover: #404040;

  /* 强调色 */
  --accent-primary: #e91e63;
  --accent-gradient: linear-gradient(135deg, #e91e63, #9c27b0);

  /* 文字 */
  --text-primary: #ffffff;
  --text-secondary: #a1a1a1;
  --text-muted: #666666;
}
```

### 10.2 间距

- 顶部栏高度: 64px (h-16)
- 导航宽度: 200px (固定)
- 生成面板宽度: 400px (固定)
- 结果区最小宽度: 400px
- 内边距: 16px / 24px
- 组件间距: 16px

### 10.3 组件样式

**主按钮:**

```css
.btn-primary {
  background: linear-gradient(135deg, #e91e63, #c2185b);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
}
```

**导航项:**

```css
.nav-item {
  padding: 8px 12px;
  border-radius: 6px;
  color: var(--text-secondary);
}
.nav-item:hover {
  background: var(--bg-panel);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--accent-primary);
  color: white;
}
```

---

## 十一、扩展规范

### 11.1 新增工具页面

1. 路由格式: `/输入类型-to-输出类型`
2. 文件位置: `src/app/(tool)/[route]/page.tsx`
3. 在 `navigation.ts` 中添加到对应分组

### 11.2 新增模型页面

1. 路由格式: `/模型名-版本号`
2. 文件位置: `src/app/(landing)/[route]/page.tsx`
3. 在 `navigation.ts` 的 `headerModels` 中添加

### 11.3 新增功能分组

1. 在 `navigation.ts` 中添加新的 NavGroup
2. 分组标题使用大写英文

---

## 十二、实施计划

### Phase 1: 基础布局

- [ ] 创建路由组结构
- [ ] 实现 Header 组件 (完整版 + 简化版)
- [ ] 实现 Sidebar 组件 (固定宽度)
- [ ] 实现三栏布局 ToolLayout

### Phase 2: 工具页面

- [ ] 实现 GeneratorPanel (基于现有组件)
- [ ] 实现 ResultPanel (已登录状态)
- [ ] 实现 ContentPanel (未登录状态)
- [ ] 连接生成 API

### Phase 3: 管理页面

- [ ] 实现 My Creations 页面
- [ ] 实现 Credits 页面
- [ ] 实现 Settings 页面

### Phase 4: 落地页

- [ ] 实现首页
- [ ] 实现模型落地页 (4个)
- [ ] 实现 Pricing 页面
- [ ] 实现 Privacy/Terms 页面

### Phase 5: 优化

- [ ] 响应式适配
- [ ] SEO 优化
- [ ] 性能优化