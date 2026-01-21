# 工具页面重构方案 - 统一组件架构

## 一、核心目标

### 1.1 设计原则

1. **组件统一**：`GeneratorPanel` 和 `VideoGeneratorInput` 是同一组件的两种形态
2. **SEO 优先**：未登录时，右侧内容完全可被搜索引擎索引
3. **状态驱动**：登录状态决定右侧内容展示
4. **配置化**：不同工具页面通过配置控制行为

### 1.2 页面结构示意

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  顶部栏 (64px) - HeaderSimple                                                        │
├────────────┬──────────────────────────────┬───────────────────────────────────────────┤
│            │                              │                                          │
│  Sidebar    │   VideoGeneratorCore       │         右侧内容区域                   │
│  (200px)    │   (400px, compact模式)      │         (flex-1)                       │
│            │                              │                                          │
│  VIDEO     │  • Model Selector           │  ┌─────────────────────────────────┐  │
│  - Img2Vid │  • Image Upload             │  │                                 │  │
│  - Txt2Vid │  • Prompt Input             │  │     未登录: ToolLandingPage      │  │
│  - Ref2Vid │  • Settings (Duration/AR)   │  │     (可滚动, SEO友好)            │  │
│  ───       │  • Generate Button          │  │                                 │  │
│  My        │                              │  └─────────────────────────────────┘  │
│  Creations │                              │  ┌─────────────────────────────────┐  │
│  ───       │                              │  │                                 │  │
│  Credits   │                              │  │     已登录: ResultPanel          │  │
│  Settings  │                              │  │     (生成结果)                   │  │
│            │                              │  │                                 │  │
└────────────┴──────────────────────────────┴───────────────────────────────────────────┘
```

---

## 二、组件架构设计

### 2.1 组件层次关系

```
VideoGeneratorCore (统一核心组件)
├── VideoGeneratorInput (全功能形态, 用于 demo/首页)
│   └── 完整功能: 模式切换、高级设置等
└── CompactGenerator (紧凑形态, 用于工具页)
    └── 核心功能: Model、Upload、Prompt、基础设置、Generate
```

### 2.2 组件复用策略

#### 方案：提取核心逻辑 + 统一配置

```typescript
// 核心配置文件
src/config/tool-pages/
├── index.ts                    # 导出所有配置
├── image-to-video.config.ts    # 图生视频配置
├── text-to-video.config.ts     # 文生视频配置
└── reference-to-video.config.ts # 参考视频配置

// 统一的核心组件
src/components/video-generator/
├── VideoGeneratorCore.tsx      # 核心组件（形态控制）
├── VideoGeneratorInput.tsx     # 全功能形态（已存在）
├── CompactGenerator.tsx        # 紧凑形态（新增）
├── generator-hooks.ts          # 共享逻辑
└── types.ts                    # 类型定义
```

### 2.3 配置文件结构

```typescript
// src/config/tool-pages/image-to-video.config.ts
import { ToolPageConfig } from "./types";

export const imageToVideoConfig: ToolPageConfig = {
  // 页面基础信息
  page: {
    title: "Image to Video",
    description: "Transform your images into stunning videos with AI",
    seoKeywords: ["image to video", "ai video generator", "photo animation"],
  },

  // 生成器配置（传递给 VideoGeneratorCore）
  generator: {
    mode: "image-to-video",           // 生成模式
    defaultModel: "wan-2-6",          // 默认模型
    availableModels: [               // 可用模型
      "wan-2-6",
      "seedance-1-5",
      "sora-2",
    ],
    showImageUpload: true,            // 显示图片上传
    showPromptInput: true,            // 显示 Prompt 输入
    promptPlaceholder: "Describe the video you want to create from this image...",
    settings: {
      showDuration: true,
      showAspectRatio: true,
      showQuality: false,
      showOutputNumber: false,
    },
    compactMode: true,               // 使用紧凑模式
  },

  // Landing Page 配置（右侧未登录内容）
  landing: {
    hero: {
      title: "Transform Your Images into Stunning Videos",
      description: "Upload an image and let AI bring it to life with smooth, realistic motion",
      ctaText: "Get Started Free",
      ctaSubtext: "50 free credits to try",
    },
    examples: [
      {
        thumbnail: "/images/examples/img2vid-1.jpg",
        title: "Photo to Living Scene",
        prompt: "A girl walking on the beach, hair flowing in the wind",
      },
      // ... 更多示例
    ],
    features: [
      "Upload any photo and bring it to life",
      "Multiple AI models for different styles",
      "Full HD output up to 1080p",
      "Fast generation in 2-5 minutes",
    ],
    supportedModels: [
      { name: "Wan 2.6", provider: "Alibaba", color: "#8b5cf6" },
      { name: "Seedance 1.5", provider: "ByteDance", color: "#ec4899" },
      { name: "Sora 2", provider: "OpenAI", color: "#000" },
    ],
  },

  // 多语言 key 前缀
  i18nPrefix: "ToolPage.ImageToVideo",
};
```

---

## 三、组件实现方案

### 3.1 VideoGeneratorCore 组件

```typescript
// src/components/video-generator/VideoGeneratorCore.tsx

interface VideoGeneratorCoreProps {
  // 形态控制
  mode: "full" | "compact";

  // 功能配置
  config: GeneratorConfig;

  // 状态
  isLoading?: boolean;
  disabled?: boolean;

  // 回调
  onSubmit?: (data: SubmitData) => void;

  // 样式
  className?: string;
}

export function VideoGeneratorCore({
  mode,
  config,
  isLoading,
  disabled,
  onSubmit,
  className
}: VideoGeneratorCoreProps) {
  // 根据模式渲染不同形态
  if (mode === "full") {
    return <VideoGeneratorInput {...props} />;
  }

  return <CompactGenerator {...props} />;
}
```

### 3.2 CompactGenerator 组件（新增）

```typescript
// src/components/video-generator/CompactGenerator.tsx

// 特点：
// 1. 固定 400px 宽度
// 2. 简洁的 UI，移除高级设置
// 3. 保留核心功能：Model、Upload、Prompt、基础设置、Generate
// 4. 与 VideoGeneratorInput 共享核心逻辑和配置

export function CompactGenerator({ config, ... }: Props) {
  return (
    <div className="w-[400px] h-full flex flex-col bg-background border-r border-border">
      {/* 页面标题 */}
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold">{config.page.title}</h2>
      </div>

      {/* 核心功能区域 - 滚动 */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Model Selector */}
        <ModelSelector config={config.models} />

        {/* Image Upload (如果需要) */}
        {config.showImageUpload && <ImageUpload />}

        {/* Prompt Input */}
        <PromptInput placeholder={config.promptPlaceholder} />

        {/* Settings */}
        <GeneratorSettings config={config.settings} />
      </div>

      {/* 底部 - Credits + Generate */}
      <div className="px-6 py-4 border-t border-border">
        <CreditsDisplay />
        <GenerateButton />
      </div>
    </div>
  );
}
```

### 3.3 共享的逻辑和 Hooks

```typescript
// src/components/video-generator/generator-hooks.ts

// 共享的 Hook
export function useGeneratorState(config: GeneratorConfig) {
  // 模型选择
  const [selectedModel, setSelectedModel] = useState(config.defaultModel);

  // 上传的图片
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // Prompt
  const [prompt, setPrompt] = useState("");

  // 参数设置
  const [duration, setDuration] = useState(config.settings.defaultDuration);
  const [aspectRatio, setAspectRatio] = useState(config.settings.defaultAspectRatio);

  // 计算积分
  const estimatedCredits = useCreditCalculation(selectedModel, duration);

  return {
    selectedModel,
    setSelectedModel,
    uploadedImages,
    setUploadedImages,
    prompt,
    setPrompt,
    duration,
    setDuration,
    aspectRatio,
    setAspectRatio,
    estimatedCredits,
  };
}
```

---

## 四、右侧内容区域架构

### 4.1 内容切换逻辑

```typescript
// src/app/[locale]/(tool)/image-to-video/page.tsx

export default async function ImageToVideoPage({ params }: Props) {
  const { locale } = await params;

  // 服务端获取用户状态
  const user = await getUser();

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar lang={locale} />

      {/* 第二栏：生成器 */}
      <VideoGeneratorCore
        mode="compact"
        config={imageToVideoConfig}
        onSubmit={handleSubmit}
      />

      {/* 第三栏：根据登录状态切换 */}
      {user ? (
        <ResultPanelWrapper user={user} />
      ) : (
        <ToolLandingPage
          config={imageToVideoConfig.landing}
          locale={locale}
        />
      )}
    </div>
  );
}
```

### 4.2 ToolLandingPage 组件（SEO 友好）

```typescript
// src/components/tool/tool-landing-page.tsx

interface ToolLandingPageProps {
  config: ToolLandingConfig;
  locale: string;
}

export function ToolLandingPage({ config, locale }: ToolLandingPageProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hero 区域 */}
      <section className="p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">{config.hero.title}</h1>
        <p className="text-muted-foreground mb-6">{config.hero.description}</p>
        <LoginCTA text={config.hero.ctaText} subtext={config.hero.ctaSubtext} />
      </section>

      {/* 示例视频 */}
      <section className="p-8">
        <h2 className="text-2xl font-semibold mb-6">See What's Possible</h2>
        <ExampleGrid examples={config.examples} />
      </section>

      {/* 特性列表 */}
      <section className="p-8">
        <FeatureList features={config.features} />
      </section>

      {/* 支持的模型 */}
      <section className="p-8">
        <ModelShowcase models={config.supportedModels} />
      </section>

      {/* CTA */}
      <section className="p-8 text-center">
        <LoginCTA large />
      </section>
    </div>
  );
}
```

### 4.3 SEO 优化要点

```typescript
// src/app/[locale]/(tool)/image-to-video/page.tsx

// 1. 添加 metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const config = imageToVideoConfig;

  return {
    title: config.page.title,
    description: config.page.description,
    keywords: config.page.seoKeywords,
    openGraph: {
      title: config.page.title,
      description: config.page.description,
      images: ["/og-image-to-video.jpg"],
    },
    alternates: {
      canonical: `https://videofly.com/image-to-video`,
      languages: {
        'en': '/en/image-to-video',
        'zh': '/zh/image-to-video',
      },
    },
  };
}

// 2. 服务端组件确保 SEO 可爬取
export default async function ImageToVideoPage({ params }: Props) {
  // ... 组件渲染

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "VideoFly - Image to Video",
            "description": config.page.description,
            "url": "https://videofly.com/image-to-video",
          }),
        }}
      />

      {/* 页面内容 */}
      <div>...</div>
    </>
  );
}
```

---

## 五、多语言配置

### 5.1 配置文件结构

```json
// src/messages/en.json
{
  "ToolPage": {
    "ImageToVideo": {
      "title": "Image to Video",
      "description": "Transform your images into stunning videos",
      "hero": {
        "title": "Transform Your Images into Stunning Videos",
        "description": "Upload an image and let AI bring it to life",
        "ctaText": "Get Started Free",
        "ctaSubtext": "50 free credits to try"
      },
      "examples": {
        "title": "See What's Possible",
        "viewAll": "View All Examples"
      },
      "features": {
        "title": "Why Choose VideoFly",
        "upload": "Upload any photo and bring it to life",
        "models": "Multiple AI models for different styles",
        "quality": "Full HD output up to 1080p",
        "fast": "Fast generation in 2-5 minutes"
      }
    },
    "TextToVideo": {
      // ...
    }
  }
}
```

### 5.2 组件中使用

```typescript
<ToolLandingPage config={imageToVideoConfig} locale={locale}>
  {/* 使用 i18n */}
  <h1>{t(`ToolPage.ImageToVideo.hero.title`)}</h1>
</ToolLandingPage>
```

---

## 六、文件结构规划

### 6.1 新增/修改的文件

```
src/
├── app/
│   └── [locale]/
│       └── (tool)/
│           ├── image-to-video/
│           │   └── page.tsx          # 修改：使用新架构
│           ├── text-to-video/
│           │   └── page.tsx          # 修改：使用新架构
│           └── reference-to-video/
│               └── page.tsx          # 修改：使用新架构
│
├── components/
│   ├── video-generator/
│   │   ├── VideoGeneratorCore.tsx      # 新增：核心组件
│   │   ├── CompactGenerator.tsx        # 新增：紧凑形态
│   │   ├── VideoGeneratorInput.tsx     # 修改：提取共享逻辑
│   │   ├── generator-hooks.ts          # 新增：共享 Hooks
│   │   ├── types.ts                    # 修改：扩展类型
│   │   └── defaults.ts                 # 修改：支持配置
│   │
│   ├── tool/
│   │   ├── tool-landing-page.tsx       # 新增：Landing Page 组件
│   │   ├── example-grid.tsx            # 新增：示例网格
│   │   ├── feature-list.tsx            # 新增：特性列表
│   │   ├── model-showcase.tsx          # 新增：模型展示
│   │   ├── login-cta.tsx               # 新增：登录 CTA
│   │   ├── result-panel-wrapper.tsx    # 新增：结果面板包装
│   │   ├── generator-panel.tsx         # 删除：被 CompactGenerator 替代
│   │   ├── content-panel.tsx           # 删除：被 ToolLandingPage 替代
│   │   └── result-panel.tsx            # 保留：优化样式
│   │
│   └── layout/
│       ├── tool-layout-content.tsx    # 修改：简化逻辑
│       └── sidebar.tsx                # 保留
│
├── config/
│   └── tool-pages/
│       ├── index.ts                    # 新增：配置导出
│       ├── types.ts                    # 新增：配置类型
│       ├── image-to-video.config.ts    # 新增
│       ├── text-to-video.config.ts     # 新增
│       └── reference-to-video.config.ts # 新增
│
└── messages/
    ├── en.json                         # 修改：添加工具页面翻译
    └── zh.json                         # 修改：添加工具页面翻译
```

---

## 七、实施步骤

### Phase 1: 核心组件重构（优先级：P0）

1. **创建配置文件结构**
   - [ ] 创建 `config/tool-pages/` 目录
   - [ ] 定义配置类型 `types.ts`
   - [ ] 创建三个工具页面配置文件

2. **重构 VideoGeneratorInput**
   - [ ] 提取共享逻辑到 `generator-hooks.ts`
   - [ ] 创建 `VideoGeneratorCore.tsx` 统一入口
   - [ ] 创建 `CompactGenerator.tsx` 紧凑形态

3. **更新 VideoGeneratorInput**
   - [ ] 改为使用共享 Hooks
   - [ ] 通过 `mode="full"` 渲染完整形态

### Phase 2: 右侧内容组件（优先级：P0）

4. **创建 ToolLandingPage 组件**
   - [ ] `tool-landing-page.tsx` 主组件
   - [ ] `example-grid.tsx` 示例网格
   - [ ] `feature-list.tsx` 特性列表
   - [ ] `model-showcase.tsx` 模型展示
   - [ ] `login-cta.tsx` CTA 按钮

5. **创建 ResultPanelWrapper**
   - [ ] `result-panel-wrapper.tsx` 包装现有 ResultPanel
   - [ ] 添加状态管理

### Phase 3: 页面集成（优先级：P0）

6. **修改工具页面**
   - [ ] `image-to-video/page.tsx`
   - [ ] `text-to-video/page.tsx`
   - [ ] `reference-to-video/page.tsx`

7. **添加 SEO 优化**
   - [ ] `generateMetadata` 函数
   - [ ] JSON-LD 结构化数据
   - [ ] OpenGraph 标签

### Phase 4: 多语言（优先级：P1）

8. **添加翻译**
   - [ ] 更新 `messages/en.json`
   - [ ] 更新 `messages/zh.json`

### Phase 5: 样式优化（优先级：P2）

9. **优化样式细节**
   - [ ] CompactGenerator 样式调整
   - [ ] ResultPanel 三种状态优化
   - [ ] ToolLandingPage 响应式

---

## 八、关键技术点

### 8.1 组件复用策略

```
┌─────────────────────────────────────────────────────────┐
│              VideoGeneratorCore (统一入口)               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐         ┌──────────────┐            │
│  │  Mode: Full  │         │ Mode: Compact│            │
│  └──────┬───────┘         └──────┬───────┘            │
│         │                        │                        │
│         ▼                        ▼                        │
│  ┌──────────────┐         ┌──────────────┐            │
│  │VideoGenerator│         │CompactGen... │            │
│  │    Input     │         │              │            │
│  └──────┬───────┘         └──────┬───────┘            │
│         │                        │                        │
│         └────────────────────────┘                        │
│                         │                                  │
│                         ▼                                  │
│              ┌──────────────────┐                        │
│              │ generator-hooks │ (共享逻辑)              │
│              │ useGeneratorState│                        │
│              └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

### 8.2 配置驱动行为

```typescript
// 不同工具页面只是配置不同
const toolPages = {
  'image-to-video': imageToVideoConfig,
  'text-to-video': textToVideoConfig,
  'reference-to-video': referenceToVideoConfig,
};

// 页面使用相同组件
<VideoGeneratorCore mode="compact" config={toolPages[route]} />
<ToolLandingPage config={toolPages[route].landing} />
```

### 8.3 SEO 实现要点

1. **服务端组件**：确保初始 HTML 包含所有内容
2. **结构化数据**：JSON-LD 帮助搜索引擎理解
3. **语义化 HTML**：正确的标签层级
4. **元数据**：完整的 title、description、keywords
5. **Canonical URL**：避免重复内容惩罚

---

## 九、预期效果

### 9.1 用户体验

| 场景 | 行为 |
|------|------|
| **未登录访问** | 左侧生成器 + 右侧完整 Landing Page |
| **点击生成** | 弹出登录框 |
| **登录成功** | 右侧切换为 ResultPanel |
| **切换工具** | 生成器参数变化 + 右侧 Landing 内容变化 |

### 9.2 SEO 效果

- ✅ 搜索引擎可以完整索引未登录页面
- ✅ 每个工具页面有独立的元数据和关键词
- ✅ 结构化数据帮助搜索引擎理解内容
- ✅ Canonical URL 避免重复内容

### 9.3 开发效率

- ✅ 单一组件源码，易于维护
- ✅ 配置化添加新工具页面
- ✅ 共享逻辑减少代码重复
- ✅ 类型安全减少运行时错误

---

## 十、下一步

确认方案后，按照 Phase 1 → Phase 5 的顺序实施。
