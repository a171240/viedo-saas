# VideoGeneratorInput 组件文档

## 概述

`VideoGeneratorInput` 是一个**完全可配置的**通用 AI 视频/图片生成输入组件。该组件设计为**纯 UI 组件**，所有数据通过 props 传入，适合集成到任何项目中。

**设计理念**：
- 组件只负责 UI 交互，不关心数据来源
- 所有配置数据通过 props 传入
- 提供默认配置，支持完全自定义
- 类型安全，提供完整的 TypeScript 支持
- **Pro 订阅支持**：部分功能可限制为付费用户专享

---

## 文件结构

```
apps/nextjs/src/components/video-generator/
├── index.ts                    # 导出入口
├── types.ts                    # TypeScript 类型定义
├── defaults.ts                 # 默认配置数据
└── video-generator-input.tsx   # 主组件
```

---

## 快速开始

### 安装导入

```tsx
import {
  VideoGeneratorInput,
  type VideoModel,
  type GeneratorConfig,
  type CreditCalculator,
  DEFAULT_VIDEO_MODELS,
} from "~/components/video-generator";
```

### 基础用法（使用默认配置）

```tsx
export default function DemoPage() {
  return (
    <VideoGeneratorInput
      onSubmit={(data) => {
        console.log("生成请求:", data);
        console.log("预估消耗积分:", data.estimatedCredits);
        // 调用你的后端 API
      }}
    />
  );
}
```

### 带 Pro 功能和动态积分计算

```tsx
import {
  VideoGeneratorInput,
  type CreditCalculator,
} from "~/components/video-generator";

// 自定义积分计算函数
const calculateCredits: CreditCalculator = ({ type, model, outputNumber, duration, resolution }) => {
  let base = model === "sora" ? 20 : model === "google" ? 15 : 8;

  // 根据时长调整
  if (duration === "12s") base *= 2;
  else if (duration === "8s") base *= 1.5;

  // 根据分辨率调整
  if (resolution === "4K") base *= 2;
  else if (resolution === "1080P") base *= 1.5;

  return Math.ceil(base * outputNumber);
};

export default function CreatePage() {
  const { user } = useAuth();

  return (
    <VideoGeneratorInput
      isPro={user?.subscription === "pro"}
      calculateCredits={calculateCredits}
      onSubmit={(data) => {
        console.log("消耗积分:", data.estimatedCredits);
      }}
      onProFeatureClick={(feature) => {
        // 显示升级弹窗
        showUpgradeModal(feature);
      }}
    />
  );
}
```

### 自定义配置

```tsx
import {
  VideoGeneratorInput,
  type GeneratorConfig,
  mergeConfig,
} from "~/components/video-generator";

const myConfig: GeneratorConfig = {
  videoModels: [
    {
      id: "my-model",
      name: "My Custom Model",
      // icon, color, description 都是可选的
      creditCost: 10,  // 基础积分消耗（数字类型，用于计算）
    },
    {
      id: "premium-model",
      name: "Premium Model",
      badge: "Pro",
      color: "#6366f1",
      creditCost: 25,
      isPro: true,  // 仅 Pro 用户可用
    },
  ],
  // 其他未指定的配置将使用默认值
};

export default function CustomPage() {
  return (
    <VideoGeneratorInput
      config={myConfig}
      isPro={false}
      onSubmit={handleSubmit}
    />
  );
}
```

### 单模式使用（仅视频或仅图片）

```tsx
// 当只配置一种类型的模型时，类型切换开关自动隐藏
const videoOnlyConfig: GeneratorConfig = {
  videoModels: DEFAULT_VIDEO_MODELS,
  imageModels: [],  // 空数组或不提供，则隐藏 AI Image 选项
};

<VideoGeneratorInput config={videoOnlyConfig} />
```

---

## 导出内容

### 组件

```tsx
// 主组件
export { VideoGeneratorInput } from "./video-generator-input";
export { default } from "./video-generator-input";
```

### 类型

```tsx
export type {
  // 核心类型
  GenerationType,        // "video" | "image"
  ModelBadge,           // "New" | "Hot" | "Audio" | "Beta" | "Pro"
  UploadType,           // "single" | "start-end" | "characters"
  ModeIconType,         // "text" | "image" | "reference" | "frames"

  // 数据模型
  VideoModel,           // 视频模型配置
  ImageModel,           // 图片模型配置
  GeneratorMode,        // 生成模式配置
  ImageStyle,           // 图片风格配置
  PromptTemplate,       // 提示词模板
  UploadedImage,        // 上传的图片信息
  UploadSlot,           // 上传槽位配置
  OutputNumberOption,   // 输出数量选项（支持 Pro 标记）

  // 配置
  GeneratorConfig,      // 完整配置对象
  GeneratorDefaults,    // 默认值配置
  GeneratorTexts,       // 国际化文本

  // 积分计算
  CreditCalculator,     // 积分计算函数类型

  // 提交数据
  SubmitData,           // 提交时返回的数据

  // 组件 Props
  VideoGeneratorInputProps,
} from "./types";
```

### 默认配置

```tsx
export {
  // 单项默认配置
  DEFAULT_VIDEO_MODELS,
  DEFAULT_IMAGE_MODELS,
  DEFAULT_VIDEO_MODES,
  DEFAULT_IMAGE_MODES,
  DEFAULT_IMAGE_STYLES,
  DEFAULT_VIDEO_ASPECT_RATIOS,
  DEFAULT_IMAGE_ASPECT_RATIOS,
  DEFAULT_DURATIONS,
  DEFAULT_RESOLUTIONS,
  DEFAULT_VIDEO_OUTPUT_NUMBERS,
  DEFAULT_IMAGE_OUTPUT_NUMBERS,
  DEFAULT_PROMPT_TEMPLATES,

  // 组合默认配置
  DEFAULT_CONFIG,        // 完整默认配置
  DEFAULT_DEFAULTS,      // 默认初始值

  // 国际化文本
  DEFAULT_TEXTS_EN,      // 英文文本
  DEFAULT_TEXTS_ZH,      // 中文文本

  // 辅助函数
  mergeConfig,           // 合并用户配置与默认配置
  mergeDefaults,         // 合并用户默认值
  getTexts,              // 获取国际化文本
} from "./defaults";
```

---

## Props 详解

### VideoGeneratorInputProps

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `config` | `GeneratorConfig` | `DEFAULT_CONFIG` | 完整配置（模型、模式、风格等） |
| `defaults` | `GeneratorDefaults` | `DEFAULT_DEFAULTS` | 初始默认值 |
| `isPro` | `boolean` | `false` | **用户是否为 Pro 订阅用户** |
| `estimatedCredits` | `number` | - | 预估消耗积分（外部计算） |
| `calculateCredits` | `CreditCalculator` | - | 自定义积分计算函数（优先级高于 estimatedCredits） |
| `disabled` | `boolean` | `false` | 是否禁用组件 |
| `isLoading` | `boolean` | `false` | 是否显示加载状态 |
| `loadingText` | `string` | - | 加载状态文本 |
| `maxPromptLength` | `number` | `2000` | 最大提示词字符数 |
| `className` | `string` | - | 自定义容器样式类 |
| `texts` | `GeneratorTexts` | 根据 locale | 国际化文本 |
| `onSubmit` | `(data: SubmitData) => void` | - | 提交回调 |
| `onChange` | `(data: Partial<SubmitData>) => void` | - | 值变化回调 |
| `onGenerationTypeChange` | `(type: GenerationType) => void` | - | 生成类型变化回调 |
| `onModelChange` | `(modelId: string, type: GenerationType) => void` | - | 模型变化回调 |
| `onModeChange` | `(modeId: string) => void` | - | 模式变化回调 |
| `onImageUpload` | `(files: File[], slot: string) => void` | - | 图片上传回调 |
| `onImageRemove` | `(slot: string) => void` | - | 图片移除回调 |
| `onPromptChange` | `(prompt: string) => void` | - | 提示词变化回调 |
| `onProFeatureClick` | `(feature: string) => void` | - | **Pro 功能点击回调（用于显示升级弹窗）** |
| `validatePrompt` | `(prompt: string) => string \| null` | - | 自定义提示词验证 |
| `validateImages` | `(files: File[]) => string \| null` | - | 自定义图片验证 |

---

## 类型定义详解

### VideoModel

```typescript
interface VideoModel {
  id: string;                    // 唯一标识符
  name: string;                  // 显示名称
  icon?: string;                 // 模型品牌 logo URL 或单字符（可选）
  badge?: ModelBadge;            // 标签（New, Hot, Audio, Pro 等）
  color?: string;                // 品牌颜色（可选，十六进制）
  description?: string;          // 模型描述（可选）
  maxDuration?: string;          // 最大时长（可选，如 "120 sec"）
  creditCost: number;            // **基础积分消耗（数字类型，用于计算）**
  creditDisplay?: string;        // 积分显示文本（可选，如 "8+"）
  enabled?: boolean;             // 是否启用（默认 true）
  isPro?: boolean;               // **是否需要 Pro 订阅**
  metadata?: Record<string, unknown>;  // 自定义元数据
}
```

### ImageModel

```typescript
interface ImageModel {
  id: string;
  name: string;
  icon?: string;                 // 模型品牌 logo URL 或单字符（可选）
  badge?: ModelBadge;
  color?: string;                // 可选
  description?: string;          // 可选
  creditCost: number;            // **基础积分消耗（数字类型）**
  creditDisplay?: string;        // 可选
  enabled?: boolean;
  isPro?: boolean;               // **是否需要 Pro 订阅**
  metadata?: Record<string, unknown>;
}
```

### OutputNumberOption

```typescript
interface OutputNumberOption {
  value: number;       // 数量值
  isPro?: boolean;     // **是否需要 Pro 订阅才能选择**
}
```

### GeneratorMode

```typescript
interface GeneratorMode {
  id: string;                    // 唯一标识符
  name: string;                  // 显示名称
  icon: ModeIconType;            // 图标类型
  uploadType?: UploadType;       // 上传配置
  description?: string;          // 模式描述
  enabled?: boolean;             // 是否启用

  // === 模式关联配置（可选） ===
  supportedModels?: string[];    // 支持的模型 ID 列表，不指定则支持所有
  durations?: string[];          // 覆盖默认时长选项
  resolutions?: string[];        // 覆盖默认分辨率选项
  aspectRatios?: string[];       // 覆盖默认宽高比选项
}
```

### GeneratorConfig

```typescript
interface GeneratorConfig {
  videoModels?: VideoModel[];
  imageModels?: ImageModel[];
  videoModes?: GeneratorMode[];
  imageModes?: GeneratorMode[];
  imageStyles?: ImageStyle[];
  promptTemplates?: PromptTemplate[];
  aspectRatios?: {
    video?: string[];
    image?: string[];
  };
  durations?: string[];
  resolutions?: string[];
  outputNumbers?: {
    video?: OutputNumberOption[];    // **使用 OutputNumberOption 支持 Pro 标记**
    image?: OutputNumberOption[];
  };
}
```

### CreditCalculator

```typescript
/**
 * 积分计算函数类型
 * 返回预估消耗的积分
 */
type CreditCalculator = (params: {
  type: GenerationType;      // 生成类型
  model: string;             // 模型 ID
  outputNumber: number;      // 输出数量
  duration?: string;         // 视频时长
  resolution?: string;       // 分辨率
}) => number;
```

### SubmitData

```typescript
interface SubmitData {
  type: GenerationType;          // "video" | "image"
  prompt: string;                // 用户输入的提示词
  images?: File[];               // 上传的图片文件
  imageSlots?: Array<{ slot: string; file: File }>;  // 图片槽位信息
  model: string;                 // 选择的模型 ID
  mode: string;                  // 选择的模式 ID
  aspectRatio: string;           // 宽高比
  duration?: string;             // 视频时长（仅视频）
  resolution?: string;           // 分辨率（仅视频）
  outputNumber: number;          // 输出数量
  style?: string;                // 图片风格 ID（仅图片）
  estimatedCredits: number;      // **预估消耗积分**
}
```

---

## 功能特性

### 1. 双模式支持
- **AI Video**: 视频生成模式
- **AI Image**: 图片生成模式
- **自动切换**: 当只配置一种类型的模型时，自动隐藏模式切换开关

### 2. Pro 订阅功能

组件支持区分免费用户和 Pro 付费用户：

```tsx
// 默认配置中，输出数量 >1 需要 Pro 订阅
const DEFAULT_VIDEO_OUTPUT_NUMBERS: OutputNumberOption[] = [
  { value: 1 },              // 免费用户可用
  { value: 2, isPro: true }, // 需要 Pro
  { value: 3, isPro: true },
  { value: 4, isPro: true },
];

// 使用示例
<VideoGeneratorInput
  isPro={user.isPro}
  onProFeatureClick={(feature) => {
    // feature 可能是 "output_number_2", "output_number_4", "model_premium" 等
    showUpgradeModal();
  }}
/>
```

### 3. 动态积分计算

积分显示的是**预估消耗积分**，而非用户当前余额。计算优先级：

1. **calculateCredits 函数**（最高优先级）
2. **estimatedCredits prop**
3. **模型的 creditCost × outputNumber**（默认计算）

```tsx
// 方式 1: 使用自定义计算函数
const calculateCredits: CreditCalculator = ({ model, outputNumber, duration }) => {
  const baseCredits = model === "sora" ? 20 : 10;
  const durationMultiplier = duration === "12s" ? 2 : 1;
  return baseCredits * outputNumber * durationMultiplier;
};

<VideoGeneratorInput calculateCredits={calculateCredits} />

// 方式 2: 外部计算后传入
<VideoGeneratorInput estimatedCredits={computedCredits} />

// 方式 3: 使用默认计算（creditCost × outputNumber）
<VideoGeneratorInput />
```

### 4. 模式-模型-参数关联

组件支持**模式与模型/参数的动态关联**，当用户切换模式时：

- **模型过滤**：只显示该模式支持的模型
- **参数覆盖**：使用模式指定的时长/分辨率/宽高比选项
- **自动切换**：如果当前选中的值不在新的可选范围内，自动切换到第一个可用选项

```tsx
const videoModes: GeneratorMode[] = [
  {
    id: "text-to-video",
    name: "Text to Video",
    icon: "text",
    uploadType: "single",
    // 只显示这些模型
    supportedModels: ["pollo", "google", "sora"],
    // 这个模式只支持这些时长
    durations: ["4s", "5s", "8s"],
    resolutions: ["720P", "1080P"],
  },
  {
    id: "frames-to-video",
    name: "Frames to Video",
    icon: "frames",
    uploadType: "start-end",
    // 首尾帧模式只有少数模型支持
    supportedModels: ["kling", "hailuo"],
    // 可以更长的视频
    durations: ["5s", "8s", "12s"],
    resolutions: ["1080P", "4K"],
    aspectRatios: ["16:9", "9:16"],  // 只支持这两种比例
  },
];
```

**工作流程**：
1. 用户选择 "Text to Video" 模式
2. 模型选择器只显示 pollo、google、sora 三个模型
3. 时长选项变为 4s、5s、8s
4. 用户切换到 "Frames to Video" 模式
5. 模型选择器变为 kling、hailuo
6. 如果之前选的是 sora，自动切换到 kling
7. 时长选项变为 5s、8s、12s

### 5. 视频生成模式

| 模式 | 说明 | 图片上传 |
|------|------|----------|
| Text/Image to Video | 文字/图片生成视频 | 单张可选 |
| Reference to Video | 参考图生成视频 | 3张（Image1 必选，Image2/3 可选） |
| Frames to Video | 首尾帧生成视频 | 2张（Start 必选，End 可选） |

### 6. 图片生成模式

| 模式 | 说明 | 图片上传 |
|------|------|----------|
| Text to Image | 文字生成图片 | 单张可选 |
| Image to Image | 图生图 | 单张可选 |

### 7. 默认参数配置
- **视频宽高比**: 16:9, 9:16, 1:1, 4:3, 3:4
- **图片宽高比**: 1:1, 16:9, 3:2, 2:3, 3:4, 4:3, 9:16
- **视频时长**: 4s, 5s, 8s, 12s
- **分辨率**: 720P, 1080P, 4K
- **输出数量**: 视频 1-4（2-4 需 Pro）, 图片 1/2/4/8（2+ 需 Pro）

### 8. 图片风格（仅图片模式）
Auto, Ghibli, Ultra Realism, Pixel Art, Japanese Anime, 3D Render, Steampunk, Watercolor, Cyberpunk, Oil Painting, Comic Book, Minimalist

---

## 第三方集成指南

### 核心理念

组件是**纯 UI 组件**，不依赖任何特定的：
- 数据库结构
- API 格式
- 状态管理库
- 认证系统

你需要做的是：
1. 从你的数据源获取配置数据
2. 转换为组件需要的格式
3. 传入组件
4. 处理 `onSubmit` 回调

### 数据适配器模式

如果你的后端数据格式与组件不同，编写一个适配器：

```typescript
// 你的后端数据格式
interface BackendVideoModel {
  model_id: string;
  display_name: string;
  logo: string;
  max_length: number;
  cost: number;
  is_premium: boolean;
}

// 适配器函数
function adaptVideoModels(backendModels: BackendVideoModel[]): VideoModel[] {
  return backendModels.map((m) => ({
    id: m.model_id,
    name: m.display_name,
    icon: m.logo || m.display_name[0],
    maxDuration: `${m.max_length} sec`,
    creditCost: m.cost,
    isPro: m.is_premium,
  }));
}

// 使用
const backendData = await fetch("/api/models").then((r) => r.json());
const videoModels = adaptVideoModels(backendData.video_models);

<VideoGeneratorInput config={{ videoModels }} onSubmit={handleSubmit} />
```

### 完整集成示例

```tsx
"use client";

import { useState } from "react";
import {
  VideoGeneratorInput,
  type SubmitData,
  type GeneratorConfig,
  type CreditCalculator,
} from "~/components/video-generator";

// 假设这是你的 API 钩子
import { useQuery, useMutation } from "@tanstack/react-query";

// 积分计算函数
const calculateCredits: CreditCalculator = ({ type, model, outputNumber, duration, resolution }) => {
  // 这里实现你的积分计算逻辑
  const modelCosts: Record<string, number> = {
    pollo: 8,
    google: 15,
    sora: 20,
  };

  let cost = modelCosts[model] ?? 10;

  if (type === "video") {
    if (duration === "12s") cost *= 2;
    if (resolution === "1080P") cost *= 1.5;
    if (resolution === "4K") cost *= 2;
  }

  return Math.ceil(cost * outputNumber);
};

export default function CreatePage() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 1. 获取配置数据（从你的后端）
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["generator-config"],
    queryFn: async (): Promise<GeneratorConfig> => {
      const res = await fetch("/api/generator/config");
      const data = await res.json();
      return data;
    },
  });

  // 2. 获取用户信息
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => fetch("/api/user").then((r) => r.json()),
  });

  // 3. 提交生成任务
  const createTask = useMutation({
    mutationFn: async (data: SubmitData) => {
      const formData = new FormData();
      formData.append("type", data.type);
      formData.append("prompt", data.prompt);
      formData.append("model", data.model);
      formData.append("mode", data.mode);
      formData.append("aspectRatio", data.aspectRatio);
      formData.append("outputNumber", String(data.outputNumber));
      formData.append("estimatedCredits", String(data.estimatedCredits));

      if (data.duration) formData.append("duration", data.duration);
      if (data.resolution) formData.append("resolution", data.resolution);
      if (data.style) formData.append("style", data.style);

      // 处理图片上传
      if (data.imageSlots) {
        data.imageSlots.forEach(({ slot, file }) => {
          formData.append(`image_${slot}`, file);
        });
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTaskId(data.taskId);
    },
  });

  if (configLoading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <VideoGeneratorInput
        config={config}
        isPro={user?.subscription === "pro"}
        calculateCredits={calculateCredits}
        isLoading={createTask.isPending}
        disabled={!user}
        onSubmit={(data) => {
          // 检查用户积分是否足够
          if (user.credits < data.estimatedCredits) {
            alert("积分不足，请充值");
            return;
          }
          createTask.mutate(data);
        }}
        onProFeatureClick={(feature) => {
          console.log("用户点击了 Pro 功能:", feature);
          setShowUpgradeModal(true);
        }}
        onModelChange={(modelId, type) => {
          console.log(`Selected ${type} model: ${modelId}`);
        }}
      />

      {taskId && <TaskStatus taskId={taskId} />}

      {showUpgradeModal && (
        <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
      )}
    </div>
  );
}
```

---

## API 设计参考

以下是**示例 API 设计**，仅供参考。你可以根据自己的业务需求设计 API。

### 配置 API（可选）

**GET /api/generator/config**

```json
{
  "videoModels": [
    {
      "id": "pollo",
      "name": "Pollo AI",
      "icon": "P",
      "badge": "New",
      "color": "#22c55e",
      "description": "Fast and efficient video generation",
      "maxDuration": "120 sec",
      "creditCost": 8,
      "isPro": false
    },
    {
      "id": "sora",
      "name": "Sora 2",
      "badge": "Pro",
      "creditCost": 20,
      "isPro": true
    }
  ],
  "imageModels": [...],
  "videoModes": [...],
  "imageModes": [...],
  "imageStyles": [...],
  "promptTemplates": [...],
  "outputNumbers": {
    "video": [
      { "value": 1 },
      { "value": 2, "isPro": true },
      { "value": 4, "isPro": true }
    ],
    "image": [
      { "value": 1 },
      { "value": 4, "isPro": true }
    ]
  }
}
```

### 生成 API

**POST /api/generate**

Request (multipart/form-data):
```
type: "video"
prompt: "A cat playing piano"
model: "pollo"
mode: "text-image-to-video"
aspectRatio: "16:9"
duration: "5s"
resolution: "720P"
outputNumber: 1
estimatedCredits: 8
image_default: [File] (可选)
```

Response:
```json
{
  "taskId": "task_abc123",
  "status": "processing",
  "estimatedTime": 120,
  "creditsUsed": 8
}
```

### 任务状态 API

**GET /api/tasks/:taskId**

```json
{
  "taskId": "task_abc123",
  "status": "completed",
  "progress": 100,
  "result": {
    "type": "video",
    "url": "https://cdn.example.com/videos/abc123.mp4",
    "thumbnail": "https://cdn.example.com/thumbnails/abc123.jpg"
  }
}
```

---

## 国际化支持

### 使用内置语言

```tsx
import { getTexts } from "~/components/video-generator";

// 获取中文文本
const zhTexts = getTexts("zh");

// 获取英文文本
const enTexts = getTexts("en");

<VideoGeneratorInput texts={zhTexts} />
```

### 自定义文本

```tsx
import { getTexts, type GeneratorTexts } from "~/components/video-generator";

const customTexts: GeneratorTexts = {
  videoPlaceholder: "Describe your video idea...",
  imagePlaceholder: "Describe your image idea...",
  aiVideo: "Video AI",
  aiImage: "Image AI",
  credits: "Tokens",
  // ... 其他文本
};

// 可以与默认文本合并
const texts = getTexts("en", customTexts);

<VideoGeneratorInput texts={texts} />
```

### 可配置的文本

```typescript
interface GeneratorTexts {
  videoPlaceholder?: string;     // 视频输入占位符
  imagePlaceholder?: string;     // 图片输入占位符
  aiVideo?: string;              // "AI Video" 标签
  aiImage?: string;              // "AI Image" 标签
  credits?: string;              // "Credits" 标签
  videoModels?: string;          // "Video Models" 标签
  imageModels?: string;          // "Image Models" 标签
  selectStyle?: string;          // "Select Style" 标签
  aspectRatio?: string;          // "Aspect Ratio" 标签
  videoLength?: string;          // "Video Length" 标签
  resolution?: string;           // "Resolution" 标签
  outputNumber?: string;         // "Output Number" 标签
  numberOfImages?: string;       // "Number of Images" 标签
  promptTooLong?: string;        // 提示词过长错误
  start?: string;                // "Start" 标签
  end?: string;                  // "End" 标签
  optional?: string;             // "(Opt)" 标签
}
```

---

## 辅助函数

### mergeConfig

合并用户配置与默认配置：

```typescript
import { mergeConfig, type GeneratorConfig } from "~/components/video-generator";

const partialConfig: GeneratorConfig = {
  videoModels: myModels,
  // 其他配置将使用默认值
};

const fullConfig = mergeConfig(partialConfig);
```

### mergeDefaults

合并用户默认值与系统默认值：

```typescript
import { mergeDefaults, type GeneratorDefaults } from "~/components/video-generator";

const myDefaults: GeneratorDefaults = {
  generationType: "image",
  imageModel: "midjourney",
};

const fullDefaults = mergeDefaults(myDefaults);
```

### getTexts

获取国际化文本：

```typescript
import { getTexts } from "~/components/video-generator";

// 获取默认英文
const en = getTexts();

// 获取中文
const zh = getTexts("zh");

// 自定义覆盖
const custom = getTexts("en", { credits: "Tokens" });
```

---

## 数据库模型参考

以下是**示例数据库模型**，仅供参考。

### Prisma Schema

```prisma
// 生成任务
model GenerationTask {
  id            String   @id @default(cuid())
  userId        String
  type          String   // "video" | "image"
  prompt        String   @db.Text
  model         String
  mode          String
  aspectRatio   String
  duration      String?
  resolution    String?
  outputNumber  Int      @default(1)
  style         String?

  status        String   @default("pending")
  progress      Int      @default(0)
  resultUrl     String?
  thumbnailUrl  String?
  errorMessage  String?
  creditsUsed   Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  completedAt   DateTime?

  user          User     @relation(fields: [userId], references: [id])
  images        GenerationImage[]

  @@index([userId])
  @@index([status])
}

// 上传的图片
model GenerationImage {
  id        String   @id @default(cuid())
  taskId    String
  slot      String   // "default", "start", "end", "char1", "char2", "char3"
  url       String

  task      GenerationTask @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
}
```

---

## 更新日志

### v2.1.0 (2025-01-15)
- **Pro 功能支持**：
  - 新增 `isPro` prop 标识用户订阅状态
  - 新增 `onProFeatureClick` 回调处理 Pro 功能点击
  - 输出数量选项支持 `isPro` 标记
  - 模型支持 `isPro` 标记
- **积分系统重构**：
  - 移除 `credits` prop（用户当前积分）
  - 新增 `estimatedCredits` prop（预估消耗积分）
  - 新增 `calculateCredits` 自定义计算函数
  - 模型 `credits: string` 改为 `creditCost: number`
  - `SubmitData` 新增 `estimatedCredits` 字段
- **模型字段简化**：
  - `icon` 改为可选，默认取 name 首字母
  - `color` 改为可选，默认使用灰色
  - `description` 改为可选
- **单模式自动检测**：
  - 当只有一种类型的模型时，自动隐藏类型切换开关
  - 自动设置为唯一可用的类型

### v2.0.0 (2025-01-15)
- **重大更新**：完全重构为可配置组件
- 新增 `config` prop 支持完整配置
- 新增 `defaults` prop 支持默认值配置
- 新增 `texts` prop 支持国际化
- 分离类型定义到 `types.ts`
- 分离默认配置到 `defaults.ts`
- 添加辅助函数：`mergeConfig`、`mergeDefaults`、`getTexts`
- "Text to Video" 改名为 "Text/Image to Video"
- 新增 `isLoading` 加载状态支持
- 新增多个事件回调

### v1.0.0 (2024-01-15)
- 初始版本
- 支持 AI Video / AI Image 双模式
- 支持多种生成模式
- 支持多模型选择
- 支持多图片上传
- 支持提示词模板
