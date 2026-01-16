# VideoFly 组件集成规划方案

> 创建日期: 2026-01-16
> 参考来源: MkSaaS 组件文档

## 一、项目现状分析

### 1.1 当前组件架构

| 分类 | 数量 | 位置 |
|------|------|------|
| UI 基础组件 | 47 | `/src/components/ui/` |
| 动画效果组件 | 15+ | `/src/components/ui/` |
| 业务组件 | 57 | `/src/components/` |
| **总计** | **109+** | - |

### 1.2 技术栈

- **Tailwind CSS**: v4.0.14（最新版本）
- **Radix UI**: `next` 版本标签（所有组件）
- **动画库**: Framer Motion 12.26.2 + tsparticles
- **组件管理**: 手动维护（无 components.json）

### 1.3 已有的基础组件

**表单**: button, input, label, checkbox, switch, select, form, calendar
**弹窗**: dialog, alert-dialog, sheet, popover, dropdown-menu, command
**展示**: card, table, data-table, tabs, accordion, avatar, skeleton
**反馈**: toast, toaster, alert, callout
**动画**: marquee, animated-list, animated-tooltip, text-generate-effect 等 15+ 个

### 1.4 缺失的关键组件

| 组件 | 当前状态 | 业务影响 |
|------|----------|----------|
| Progress | ❌ 缺失 | 视频生成进度无法展示 |
| Badge | ❌ 缺失 | 状态标签用 span 替代 |
| Tooltip | ❌ 基础版缺失 | 只有动画版本 |
| Slider | ❌ 缺失 | 时长/质量调节无组件 |
| Radio Group | ❌ 缺失 | 单选用 checkbox 替代 |
| Breadcrumb | ❌ 缺失 | 仪表板导航不完整 |
| Spinner | ❌ 缺失 | 加载状态用 icons 替代 |
| Drawer | ❌ 缺失 | 移动端底部面板 |

---

## 二、集成组件清单

### 2.1 第一阶段：基础组件补全（必要）

这些组件是开发中高频使用的基础设施，必须优先补全。

| 组件 | 来源 | 用途 | 实现方式 |
|------|------|------|----------|
| **Progress** | shadcn/ui | 视频生成进度、上传进度 | 手动复制 |
| **Badge** | shadcn/ui | 视频状态、模型标签、套餐标识 | 手动复制 |
| **Tooltip** | shadcn/ui | 参数说明、功能提示 | 手动复制 |
| **Slider** | shadcn/ui | 视频时长、质量参数 | 手动复制 |
| **Radio Group** | shadcn/ui | 模型选择、画面比例选择 | 手动复制 |
| **Separator** | shadcn/ui | 内容分隔、表单分组 | 手动复制 |
| **Spinner** | 自定义 | 按钮加载、页面加载 | 基于 icons 封装 |

### 2.2 第二阶段：增强组件（推荐）

提升用户体验和开发效率的组件。

| 组件 | 来源 | 用途 | 优先级 |
|------|------|------|--------|
| **Breadcrumb** | shadcn/ui | 仪表板导航层级 | 高 |
| **Drawer** | shadcn/ui (vaul) | 移动端底部面板 | 高 |
| **Sonner** | shadcn/ui | 替代现有 toast 系统 | 中 |
| **Input OTP** | shadcn/ui | 验证码输入 | 中 |
| **Pagination** | shadcn/ui | 视频列表分页 | 中 |
| **Collapsible** | shadcn/ui | 可折叠内容区 | 低 |

### 2.3 第三阶段：Magic UI 动画组件（可选）

适合 AI 视频产品展示的动画效果。

| 组件 | 来源 | 用途 | 优先级 |
|------|------|------|--------|
| **Hero Video Dialog** | Magic UI | 首页视频展示、作品预览 | 高 |
| **Blur Fade** | Magic UI | 页面入场动画 | 高 |
| **Confetti** | Magic UI | 视频生成成功庆祝 | 中 |
| **Bento Grid** | Magic UI | 功能特性展示 | 中 |
| **Border Beam** | Magic UI | 卡片边框动画 | 低 |
| **Ripple** | Magic UI | 背景涟漪效果 | 低 |

### 2.4 第四阶段：Animate UI 组件（可选）

现代交互动画组件。

| 组件 | 来源 | 用途 | 优先级 |
|------|------|------|--------|
| **Counting Number** | Animate UI | 统计数字动画（用量、价格） | 高 |
| **Sliding Number** | Animate UI | 信用余额变化动画 | 中 |
| **Gradient Background** | Animate UI | 页面背景效果 | 低 |
| **Stars Background** | Animate UI | 首页背景 | 低 |

### 2.5 不推荐集成的组件

| 组件 | 原因 |
|------|------|
| DiceUI Kanban | 视频平台不需要看板功能 |
| Tailark 营销组件 | 已有类似实现，重复度高 |
| 大部分文本动画 | 已有 text-generate-effect 等 |
| Three.js 组件 | 已有完整 3D 方案 |
| Code Editor | 非核心业务功能 |

---

## 三、实施计划

### 3.1 阶段一实施细节（第一优先级）

#### 3.1.1 Progress 组件

**文件**: `/src/components/ui/progress.tsx`

```tsx
// 基于 @radix-ui/react-progress（已安装）
// 支持：默认进度、不确定状态、颜色变体
```

**使用场景**:
- `VideoStatusCard` - 显示视频生成进度百分比
- 文件上传进度条
- 信用消耗进度

#### 3.1.2 Badge 组件

**文件**: `/src/components/ui/badge.tsx`

```tsx
// 变体：default, secondary, destructive, outline
// 尺寸：sm, default, lg
```

**使用场景**:
- 视频状态标签（PENDING, GENERATING, COMPLETED, FAILED）
- 模型标签（New, Hot, Pro, Beta）
- 套餐标识（Basic, Pro, Enterprise）

#### 3.1.3 Tooltip 组件

**文件**: `/src/components/ui/tooltip.tsx`

```tsx
// 基于 @radix-ui/react-tooltip（已安装）
// 方向：top, right, bottom, left
```

**使用场景**:
- 参数说明提示
- 按钮功能说明
- 功能限制提示

#### 3.1.4 Slider 组件

**文件**: `/src/components/ui/slider.tsx`

```tsx
// 基于 @radix-ui/react-slider（已安装）
// 支持：单值、范围、步进、刻度
```

**使用场景**:
- 视频时长选择
- 视频质量调节
- 价格范围筛选

#### 3.1.5 Radio Group 组件

**文件**: `/src/components/ui/radio-group.tsx`

```tsx
// 基于 @radix-ui/react-radio-group（已安装）
// 支持：垂直/水平布局、禁用状态
```

**使用场景**:
- AI 模型选择
- 画面比例选择（16:9, 9:16, 1:1）
- 视频质量选择

#### 3.1.6 Separator 组件

**文件**: `/src/components/ui/separator.tsx`

```tsx
// 基于 @radix-ui/react-separator（已安装）
// 方向：horizontal, vertical
```

#### 3.1.7 Spinner 组件

**文件**: `/src/components/ui/spinner.tsx`

```tsx
// 基于 Lucide Loader2 图标 + 动画
// 尺寸：sm, default, lg
// 颜色：继承当前文本颜色
```

### 3.2 阶段二实施细节

#### Breadcrumb 组件
- 位置: `/src/components/ui/breadcrumb.tsx`
- 使用: Dashboard 页面导航

#### Drawer 组件
- 位置: `/src/components/ui/drawer.tsx`
- 依赖: vaul（已安装）
- 使用: 移动端视频参数面板

#### Sonner 组件
- 位置: `/src/components/ui/sonner.tsx`
- 依赖: 需安装 sonner 包
- 使用: 替代现有 toast 系统（可选）

### 3.3 阶段三实施细节

Magic UI 组件需要从官方仓库复制并适配：
- 文件位置: `/src/components/magicui/`
- 依赖: framer-motion（已安装）

### 3.4 目录结构规划

```
src/components/
├── ui/                    # shadcn/ui 基础组件
│   ├── badge.tsx          # [新增]
│   ├── breadcrumb.tsx     # [新增]
│   ├── drawer.tsx         # [新增]
│   ├── progress.tsx       # [新增]
│   ├── radio-group.tsx    # [新增]
│   ├── separator.tsx      # [新增]
│   ├── slider.tsx         # [新增]
│   ├── spinner.tsx        # [新增]
│   ├── tooltip.tsx        # [新增]
│   └── ... (existing)
│
├── magicui/               # [新增目录] Magic UI 动画组件
│   ├── blur-fade.tsx
│   ├── confetti.tsx
│   ├── hero-video-dialog.tsx
│   └── ...
│
├── animate-ui/            # [新增目录] Animate UI 组件
│   ├── counting-number.tsx
│   └── ...
│
└── ... (existing business components)
```

---

## 四、验证计划

### 4.1 组件验证

每个组件添加后需验证：

1. **类型检查**: `pnpm typecheck`
2. **构建验证**: `pnpm build`
3. **视觉验证**: 在相关页面集成测试

### 4.2 集成验证清单

| 组件 | 验证页面 | 验证内容 |
|------|----------|----------|
| Progress | /demo | 视频生成进度显示 |
| Badge | /dashboard/videos | 视频状态标签 |
| Tooltip | /demo | 参数说明提示 |
| Slider | /demo | 时长选择滑块 |
| Radio Group | /demo | 模型选择 |
| Breadcrumb | /dashboard | 导航层级 |

### 4.3 兼容性验证

- React 19 兼容性
- Tailwind CSS v4 兼容性
- 现有组件无冲突

---

## 五、风险评估

### 5.1 低风险

- Progress, Badge, Tooltip, Separator: Radix UI 依赖已安装
- Slider, Radio Group: Radix UI 依赖已安装

### 5.2 中风险

- Drawer: 依赖 vaul 包，需确认版本兼容性
- Sonner: 需新安装包，可能影响现有 toast 系统

### 5.3 注意事项

1. **Tailwind v4 兼容性**: 部分 shadcn/ui 示例代码基于 v3，需调整
2. **无 components.json**: 所有组件需手动复制和适配
3. **Biome 忽略**: 新 UI 组件需添加到 biome.json 忽略列表

---

## 六、用户偏好确认

根据沟通确认的偏好：

- ✅ **集成优先级**: 基础组件优先
- ✅ **Toast 系统**: 迁移到 Sonner
- ✅ **目录结构**: Magic UI 使用单独目录 `/src/components/magicui/`

---

## 七、最终实施顺序

### 第一批（立即实施）- 基础组件

| 序号 | 组件 | 文件路径 | 依赖状态 |
|------|------|----------|----------|
| 1 | Progress | `/src/components/ui/progress.tsx` | ✅ Radix 已安装 |
| 2 | Badge | `/src/components/ui/badge.tsx` | ✅ 无额外依赖 |
| 3 | Tooltip | `/src/components/ui/tooltip.tsx` | ✅ Radix 已安装 |
| 4 | Spinner | `/src/components/ui/spinner.tsx` | ✅ Lucide 已安装 |
| 5 | Slider | `/src/components/ui/slider.tsx` | ✅ Radix 已安装 |
| 6 | Radio Group | `/src/components/ui/radio-group.tsx` | ✅ Radix 已安装 |
| 7 | Separator | `/src/components/ui/separator.tsx` | ✅ Radix 已安装 |

### 第二批（近期实施）- 增强组件

| 序号 | 组件 | 文件路径 | 依赖状态 |
|------|------|----------|----------|
| 8 | Breadcrumb | `/src/components/ui/breadcrumb.tsx` | ✅ 无额外依赖 |
| 9 | Drawer | `/src/components/ui/drawer.tsx` | ✅ vaul 已安装 |
| 10 | Sonner | `/src/components/ui/sonner.tsx` | ⚠️ 需安装 sonner |
| 11 | Pagination | `/src/components/ui/pagination.tsx` | ✅ 无额外依赖 |

### 第三批（按需实施）- Magic UI 动画组件

| 序号 | 组件 | 文件路径 | 依赖状态 |
|------|------|----------|----------|
| 12 | Hero Video Dialog | `/src/components/magicui/hero-video-dialog.tsx` | ✅ framer-motion 已安装 |
| 13 | Blur Fade | `/src/components/magicui/blur-fade.tsx` | ✅ framer-motion 已安装 |
| 14 | Confetti | `/src/components/magicui/confetti.tsx` | ⚠️ 需安装 canvas-confetti |
| 15 | Border Beam | `/src/components/magicui/border-beam.tsx` | ✅ 无额外依赖 |

### 第四批（可选实施）- Animate UI 组件

| 序号 | 组件 | 文件路径 | 依赖状态 |
|------|------|----------|----------|
| 16 | Counting Number | `/src/components/animate-ui/counting-number.tsx` | ✅ framer-motion 已安装 |
| 17 | Sliding Number | `/src/components/animate-ui/sliding-number.tsx` | ✅ framer-motion 已安装 |

---

## 八、依赖安装清单

### 需要安装的新依赖

```bash
# Sonner - Toast 通知系统
pnpm add sonner

# Canvas Confetti - 庆祝动画（可选）
pnpm add canvas-confetti
pnpm add -D @types/canvas-confetti
```

### 已安装的依赖（无需操作）

- `@radix-ui/react-progress` - Progress 组件
- `@radix-ui/react-tooltip` - Tooltip 组件
- `@radix-ui/react-slider` - Slider 组件
- `@radix-ui/react-radio-group` - Radio Group 组件
- `@radix-ui/react-separator` - Separator 组件
- `vaul` - Drawer 组件
- `framer-motion` - 动画支持

---

## 九、关键文件清单

### 新增文件

**基础组件** (`/src/components/ui/`):
- `progress.tsx`
- `badge.tsx`
- `tooltip.tsx`
- `spinner.tsx`
- `slider.tsx`
- `radio-group.tsx`
- `separator.tsx`
- `breadcrumb.tsx`
- `drawer.tsx`
- `sonner.tsx`
- `pagination.tsx`

**Magic UI 组件** (`/src/components/magicui/`):
- `hero-video-dialog.tsx`
- `blur-fade.tsx`
- `confetti.tsx`
- `border-beam.tsx`

**Animate UI 组件** (`/src/components/animate-ui/`):
- `counting-number.tsx`
- `sliding-number.tsx`

### 需修改的文件

| 文件 | 修改内容 |
|------|----------|
| `/biome.json` | 添加 magicui、animate-ui 到忽略列表 |
| `/src/app/layout.tsx` | 添加 Sonner Toaster 组件 |
| 现有使用 toast 的文件 | 迁移到 sonner API（可渐进） |

---

## 十、验证计划

### 构建验证

```bash
# 类型检查
pnpm typecheck

# 构建验证
pnpm build

# 开发服务器
pnpm dev
```

### 组件集成验证

| 组件 | 验证页面 | 验证内容 |
|------|----------|----------|
| Progress | `/demo` | 视频生成进度条 |
| Badge | `/dashboard/videos` | 视频状态标签 |
| Tooltip | `/demo` | 参数提示信息 |
| Slider | `/demo` | 时长选择 |
| Radio Group | `/demo` | 模型/比例选择 |
| Sonner | 全局 | 操作通知 |
| Hero Video Dialog | `/` | 首页视频展示 |

---

## 十一、总结

### 组件数量统计

| 阶段 | 组件数 | 状态 |
|------|--------|------|
| 第一批（基础） | 7 | 必须实施 |
| 第二批（增强） | 4 | 推荐实施 |
| 第三批（Magic UI） | 4 | 按需实施 |
| 第四批（Animate UI） | 2 | 可选实施 |
| **总计** | **17** | - |

### 目录结构预览

```
src/components/
├── ui/                     # shadcn/ui 基础组件
│   ├── badge.tsx           # [新增]
│   ├── breadcrumb.tsx      # [新增]
│   ├── drawer.tsx          # [新增]
│   ├── pagination.tsx      # [新增]
│   ├── progress.tsx        # [新增]
│   ├── radio-group.tsx     # [新增]
│   ├── separator.tsx       # [新增]
│   ├── slider.tsx          # [新增]
│   ├── sonner.tsx          # [新增]
│   ├── spinner.tsx         # [新增]
│   ├── tooltip.tsx         # [新增]
│   └── ... (现有组件)
│
├── magicui/                # [新增目录] Magic UI 动画组件
│   ├── blur-fade.tsx
│   ├── border-beam.tsx
│   ├── confetti.tsx
│   └── hero-video-dialog.tsx
│
├── animate-ui/             # [新增目录] Animate UI 组件
│   ├── counting-number.tsx
│   └── sliding-number.tsx
│
└── ... (现有业务组件)
```

---

## 参考资源

- [shadcn/ui 官方文档](https://ui.shadcn.com)
- [Magic UI 官方文档](https://magicui.design)
- [Animate UI 官方文档](https://animate-ui.com)
- [MkSaaS 组件文档](https://mksaas.com/zh/docs/components)
