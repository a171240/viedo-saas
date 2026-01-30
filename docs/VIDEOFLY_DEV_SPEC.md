# VideoFly 海外站（viedo-saas）Codex 开发文档 · 纯享版完整版 v2

> 仓库：https://github.com/a171240/viedo-saas.git
> 线上：https://viedo-saas.vercel.app/zh
> 目标：把现有模板升级成可面向海外真实获客/付费的 AI Video SaaS（默认英文 /en），并引入“工作流式 Prompt Studio + 4x4 内容日历 + 场景化入口”作为独特竞争点（借鉴 ipnrgc 方法论，但不和 ipnrgc 合并）。

---

## 0. 给 Codex 的执行指令（必须照做）

你现在是 Codex，请严格按以下规则执行：

1) **先读后改**：先扫描项目结构与关键文件，再开始改动。
2) **一次只做一个 Ticket**：每个 Ticket 单独 commit / PR，commit 信息包含 Ticket 编号。
3) **不破坏核心语义**：不改变 credits 的冻结/结算/释放语义，不破坏 `/api/v1/*` 合约。
4) **配置驱动优先**：所有营销文案、套餐、模型能力、默认参数、模板库，优先进入 `src/config/*`。
5) **i18n 全覆盖**：所有用户可见文案必须走 next-intl（严禁硬编码英文/中文混用）。
6) **安全优先**：webhook/callback 必须验签 + 幂等；生成接口必须有 rate limit；上传必须校验文件类型/大小。
7) **每个 Ticket 都要自检**：运行最小回归流程（见文档末尾“回归清单”）。

---

## 1. 项目自检（Codex 第一步必须执行）

### 1.1 生成结构快照（写到 PR 描述里）
在仓库根目录执行：
- `tree -L 4 -I "node_modules|.next|dist|build"`
- `cat package.json`
- `rg -n "next-intl|useTranslations|messages" src | head`
- `rg -n "api/v1" src/app/api -S`
- `rg -n "credit|freeze|settle|release" src -S`

把结果写进 PR 描述，用于后续定位文件路径差异。

### 1.2 确认默认 locale/路由结构
检查：
- `src/app/[locale]/...` 是否存在
- middleware 是否做了 locale 重定向
- `src/messages/en.json`、`src/messages/zh.json` 是否存在

---

## 2. 产品策略（海外站）——只做一件事先跑通闭环

### 2.1 冷启动定位（首页一句话）
不要写“支持 Sora2、Veo…”。写结果：
- “Turn product images into TikTok-ready video ads in minutes.”
- “Script → Storyboard → Variations → Generate.”

### 2.2 第一垂直切入（建议默认）
**Product-to-Video Ads（电商/DTC 商品图 → 9:16 广告短视频）**
理由：输入标准化（商品图 + 卖点 + 受众 + 平台），输出可投放（9:16），最易付费。

### 2.3 独特竞争点（迁移 ipnrgc 方法论）
不合并站点，只迁移“交付工作流”：
- Positioning（定位一句话）
- Angle Mining（角度库）
- 4x4 Content Calendar（选题矩阵）
- Shoot-ready Script（可拍脚本：Hook/分镜/字幕/CTA）
- Video Prompt Builder（把分镜翻译成模型 prompt）
=> 这整套在 VideoFly 里以 **Prompt Studio** 体现。

---

## 3. 路线图（P0 → P1 → P2）

- **P0：上线底线**（信任、合规、语言一致、定价清晰、成本透明、安全幂等）
- **P1：开始赚钱**（场景化入口 + Prompt Studio + 4x4 日历 + 批量变体 + Brand Kit + Share/Remix）
- **P2：规模化**（并发权益、任务恢复、可观测/成本、反滥用、SEO矩阵与展示页）

---

## 4. P0 工单（必须先做完 P0 才允许做 P1）

### Ticket P0-01：修复 Footer/Nav 的 404 页面（或移除入口）
**目标**：/en 与 /zh 下 About/Contact/Privacy/Terms/Cookies/Blog/Careers 全可访问。

**实现步骤**
1) 在 `src/app/[locale]/(marketing)/` 新建页面：
   - `about/page.tsx`
   - `contact/page.tsx`
   - `privacy/page.tsx`
   - `terms/page.tsx`
   - `cookies/page.tsx`
   - `blog/page.tsx`（先占位：Coming soon + subscribe）
   - `careers/page.tsx`（先占位：No openings + contact）
2) 统一这些页面的布局组件（复用 marketing layout）。
3) 更新 footer/nav 配置（通常在 `src/config/navigation.ts` 或类似文件）保证链接指向正确路由。

**验收标准**
- 访问 `/en/privacy` `/en/terms` `/en/cookies` `/en/contact` 全部 200
- 访问 `/zh/privacy` `/zh/terms` `/zh/cookies` `/zh/contact` 全部 200
- Footer 点击不再 404

---

### Ticket P0-02：海外默认语言为英文（/en 作为默认入口）
**目标**：根路径 `/` 自动进入 `/en`，中文 `/zh` 可选保留。

**实现步骤**
1) 修改 i18n 默认 locale = `en`（在 i18n 配置文件里）。
2) middleware：若无 locale 前缀则重定向到 `/en`。
3) 增加语言切换 UI（EN/中文），切换保持同 slug。

**验收标准**
- `/` → `/en`
- `/en/text-to-video` 切换到中文后变 `/zh/text-to-video`

---

### Ticket P0-03：删除占位符与不可验证宣传（提升可信度）
**目标**：清除 0 值/夸张累计数据/重复 testimonials，改为可承诺表达。

**实现步骤**
1) 新建配置：`src/config/marketing.ts`
   - `stats` 可为空（为空不渲染模块）
   - `typicalGenerationTime = "2–5 minutes"`
   - `qualityNote = "Up to 1080p (model-dependent)"`
   - `freeCreditsNote = "50 free credits — no credit card required"`
2) Landing 页读取该配置。
3) 删除或重写任何 “1M+ / 500K+ / 100K+ / 50K+” 类指标（若无真实来源就删）。

**验收标准**
- 首页不再出现 `0 s / 0 min / 0 p`
- 首页不再出现 “+500000 / 1M+ users” 这类不可自证数字

---

### Ticket P0-04：定价页信息架构重做（Subscription vs Credit Packs）
**目标**：用户 15 秒内理解买什么，权益是什么，credits 怎么算。

**实现步骤**
1) 定价页拆成两个 Tab：
   - `Subscription`（每月 credits + 权益：并发数/优先队列/无水印/商用）
   - `Credit Packs`（一次性 credits，写明有效期）
2) 去掉“按月/按年/40% off”占位 UI（除非你真的做年付逻辑）。
3) 套餐卡片里增加：
   - `Parallel tasks`（并发任务数）
   - `Commercial use`（是否允许商用）
   - `Watermark`（是否无水印）
4) 修复任何未翻译 key（如 `large`）。

**验收标准**
- 用户明确知道：订阅 vs 一次性
- 每个套餐能看到：并发数、商用、无水印
- 页面无未翻译 key

---

### Ticket P0-05：修正 Reference 功能定义（二选一）
**强烈建议选 A**（更快上线更少坑）

**A. 改成 Reference Image to Video**
- 页面标题/描述/SEO/字段全部改为 “Reference Image”
- 删除“upload reference video”相关文案

**B. 真正支持 Reference Video 上传**
- 表单接受 mp4/webm/mov
- 上传走 presign
- provider 必须验证支持该能力，否则不要做

**验收标准**
- 文案与输入类型一致（不再“说视频、收图片”）

---

### Ticket P0-06：全站 i18n 覆盖（路径语言一致）
**目标**：/en 全英文，/zh 全中文，禁止混用。

**实现步骤**
1) 扫描 `src/app/[locale]` 和 `src/components`：把所有硬编码字符串替换为 `t("...")`
2) 为每个页面建立 messages namespace（例如 `landing.*`, `pricing.*`, `generator.*`）
3) 修复 `/zh/*` 页面出现英文大片段的问题

**验收标准**
- `/zh/text-to-video`、`/zh/image-to-video`、`/zh/pricing` 不再出现整段英文营销文案

---

### Ticket P0-07：Credits 解释器（生成前可见）
**目标**：让用户理解“为什么扣这么多 credits”，减少投诉和流失。

**实现步骤**
1) 在生成器组件里（例如 `VideoGeneratorInput`）增加 `ⓘ` popover：
   - base credits
   - per extra second
   - resolution multiplier（若有）
   - outputNumber multiplier（若有）
2) 前端预估来自 `src/config/credits.ts`（单一来源）
3) 明示：最终扣费以后端为准；失败会自动释放/退款（只有后端确实实现才写）

**验收标准**
- 任意模型/时长，用户都能看到 credits 计算过程

---

### Ticket P0-08：模型能力矩阵驱动 UI（禁掉不支持选项）
**目标**：避免用户选择“模型不支持”的组合导致失败。

**实现步骤**
1) 新建/完善 `src/config/model-capabilities.ts`
   - supportedDurations
   - supportedRatios
   - supportedResolutions
   - supportsAudio
2) 生成器 UI 根据模型动态展示/禁用选项
3) 默认参数对齐首页/工具页示例

**验收标准**
- 切换模型时，UI 选项自动纠正为可用组合

---

### Ticket P0-09：Cookie Consent（Analytics 可选）
**目标**：海外站基本合规与用户信任。

**实现步骤**
1) 增加 Cookie Banner：
   - Necessary（不可关）
   - Analytics（可选）
2) 未同意前不加载埋点脚本
3) 保存用户选择（localStorage/cookie）

**验收标准**
- 未同意时不加载 analytics；同意后才加载

---

### Ticket P0-10：Webhook/Callback 验签 + 幂等（支付 + AI）
**目标**：避免重复加 credits、重复结算、伪造回调。

**实现步骤**
1) 支付 webhook：
   - 验签（按你使用的 provider）
   - 记录 event_id（DB 表 `webhook_events` 或等价机制）
2) AI callback：
   - 验签（AI_CALLBACK_SECRET）
   - 以 providerTaskId 做幂等去重
3) `/api/v1/video/generate` 加 rate limit（IP + user）

**验收标准**
- 重放同一个 webhook 10 次：credits 只变更一次
- 回调签名错误：401/403

---

## 5. P1 工单（差异化与转化：Prompt Studio + 场景化入口）

### Ticket P1-01：新增场景化入口 Product-to-Video Ads
**路由**：`/[locale]/product-to-video`

**表单字段**
- productImages（1–3）
- productName
- keyBenefits（3–5）
- targetAudience
- platform（TikTok/Reels/Shorts 默认 9:16；YouTube 可选 16:9）
- style（UGC/Luxury/Minimal/Tech/Cute）
- variationCount（3/5/10，默认 3）

**实现步骤**
1) 复用 image-to-video 的生成链路
2) prompt 来自 Prompt Studio 的模板拼装（见 P1-02）
3) 默认隐藏模型选择（Advanced 才显示）

**验收标准**
- 不懂 prompt 的用户也能完成一次生成配置并出结果

---

### Ticket P1-02：Prompt Studio（工作流式提示词）
**目标**：从“一个输入框”升级为“交付工作流”。

**UI 形态**
- 在 Text/Image/Reference/Product-to-Video 页面增加按钮：`Prompt Studio`
- 打开一个 Stepper（4 步）：
  1) Positioning（定位一句话）
  2) Angle Mining（角度库）
  3) 4x4 Calendar（选题矩阵）
  4) Script & Prompt（脚本/分镜/字幕/最终 prompt）

**V1（无外部 LLM）实现方式**
- 纯模板/规则拼装（成本 0）
- 输出：
  - positioningLine
  - angles（>=8）
  - 4x4 calendar（16）
  - script（hook/value/proof/cta）
  - shotList（5–7）
  - onScreenText（5–7）
  - videoPrompt（最终给模型）

**文件结构**
- `src/config/prompt-studio/types.ts`
- `src/config/prompt-studio/templates.ts`
- `src/components/prompt-studio/*`

**验收标准**
- 用户只填 Brief，也能得到结构化输出（定位/角度/脚本/分镜/字幕/prompt）
- 一键把 videoPrompt 填回生成器输入框

---

### Ticket P1-03：4x4 内容日历（选题矩阵）生成与批量排队
**目标**：把内容生产变成“可重复的产能”。

**规则（V1 模板版）**
- 4 类：Acquire / Trust / Convert / Retain
- 每类 4 个角度（共 16）
- 每个角度自动生成：hook/价值点/证明/cta + shotList

**批量排队**
- 用户可一键把 16 个角度中选中 N 个批量创建任务（N=3/5/10）

**验收标准**
- 同一产品一次输入，能排队创建 >=5 个不同角度的生成任务

---

### Ticket P1-04：Batch Variations（真正的变体而非随机多产出）
**目标**：变体是“不同钩子/不同角度/不同风格”，不是单纯 outputNumber++。

**实现步骤**
1) variationCount 生成多个不同的 prompt（不同 hook/angle/style）
2) 对每个 variation 创建独立任务（taskId 不同）
3) credits 预估 = 单次 * variationCount（明示）

**验收标准**
- 变体 prompt 有显著差异，可在历史里对比

---

### Ticket P1-05：Brand Kit（品牌一致性）
**实现**
- Settings 增加 Brand Kit：
  - brandTone
  - styleSuffix
  - bannedWords
  - default ratio/duration
- 生成时自动拼接到 prompt（且 UI 明示可关闭）

**验收标准**
- 同账号生成风格一致；关闭后 prompt 恢复原样

---

### Ticket P1-06：Share + Remix（传播与复用）
**实现**
- 分享页：`/[locale]/share/[uuid]`
- 展示视频、参数、prompt（可选隐藏敏感字段）
- Remix：回填生成器参数并可再生成

**验收标准**
- 分享链接可访问并播放；Remix 可用

---

## 6. P2 工单（规模化：稳定性、成本、安全）

### Ticket P2-01：Stuck Recovery（卡死任务自动恢复）
**实现**
- job/cron 扫描 RUNNING 超时任务
- 规则：超过阈值则标记 FAILED 并释放 credits（或触发重试）
- admin 可手动触发恢复

**验收**
- 卡死任务不会无限占 credits

---

### Ticket P2-02：可观测与成本报表（最小版）
**实现**
- 每个任务记录：provider/model/duration/resolution/latency/result/failCode/creditsUsed
- admin 页输出：成功率、平均耗时、失败原因 Top、成本估算

**验收**
- 可回答：哪个模型最不稳定/最慢/最贵

---

### Ticket P2-03：Parallel Tasks（并发权益）
**实现**
- 套餐配置加入 maxParallelTasks
- generate 前检查用户当前 RUNNING 数量，超限提示升级

**验收**
- 并发限制按套餐生效

---

### Ticket P2-04：反滥用（成本保护）
**实现**
- 未付费用户更严格限频/并发/每日上限
- 新账号冷却时间
- IP + 账号组合策略

**验收**
- 刷接口行为被限制，不烧爆成本

---

## 7. Prompt Studio 模板包（可直接拷贝的初版）

> 说明：以下模板不依赖外部 LLM，纯规则拼装，可立即上线。
> 模板只输出“结构化脚本 + 分镜 + 视频 prompt”，字幕/贴字不要强塞进视频本体，避免生成视频出现乱码文字。

### 7.1 types.ts（如果项目没有，创建）
```ts
export type Locale = "en" | "zh";

export type UseCase =
  | "product_ads"
  | "ugc_ads"
  | "app_promo"
  | "brand_story"
  | "local_leadgen";

export type Framework =
  | "hook_value_cta"
  | "pas"
  | "aida"
  | "before_after_bridge";

export type PromptStudioInput = Record<string, string | string[]>;

export type PromptStudioOutput = {
  positioningLine: string;
  angles: string[];
  calendar4x4: { stage: "Acquire"|"Trust"|"Convert"|"Retain"; angles: string[] }[];
  script: {
    hook: string;
    valuePoints: string[];
    proof: string;
    cta: string;
    onScreenText: string[];
    shotList: string[];
  };
  videoPrompt: string;
  negativePrompt?: string;
  metadata: {
    ratio: "9:16" | "16:9" | "1:1" | "4:3" | "3:4";
    durationSeconds: number;
    resolution?: "720p" | "1080p";
    outputNumber?: number;
    generateAudio?: boolean;
  };
};

export type PromptTemplate = {
  id: string;
  locale: Locale;
  useCase: UseCase;
  framework: Framework;
  name: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "textarea" | "tags" | "select";
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  build: (input: PromptStudioInput) => PromptStudioOutput;
};
````

### 7.2 templates.en.ts（创建）

```ts
import { PromptTemplate } from "./types";

const asArr = (v: unknown) => Array.isArray(v) ? v.filter(Boolean).map(String) : [];
const asStr = (v: unknown) => String(v ?? "").trim();
const pick = (arr: string[], n: number) => arr.slice(0, n);

const baseNegative = [
  "blurry","low quality","watermark","text artifacts","logo distortion",
  "extra limbs","flicker","jitter","warped product","deformed hands"
].join(", ");

const build4x4 = (product: string, audience: string, benefits: string[]) => {
  const b1 = benefits[0] ?? "your #1 benefit";
  const b2 = benefits[1] ?? "your #2 benefit";
  const b3 = benefits[2] ?? "your #3 benefit";

  return [
    { stage: "Acquire" as const, angles: [
      `Stop scrolling: ${product} for ${audience}`,
      `3 signs you need ${product}`,
      `The ${audience} hack nobody tells you`,
      `POV: You discover ${product} and it changes your routine`,
    ]},
    { stage: "Trust" as const, angles: [
      `Why ${product} works (simple explanation)`,
      `Before/After story (no fake claims) + ${b1}`,
      `Behind the scenes: how ${product} is made / designed`,
      `Common mistakes ${audience} makes — fix with ${product}`,
    ]},
    { stage: "Convert" as const, angles: [
      `Limited offer: get ${b1} today`,
      `Compare: ${product} vs alternatives (honest)`,
      `Unboxing + first impression + ${b2}`,
      `FAQ: does it work for ${audience}? (${b3})`,
    ]},
    { stage: "Retain" as const, angles: [
      `How to get the best results with ${product}`,
      `3 ways to use ${product} (quick tips)`,
      `My weekly routine with ${product}`,
      `Upgrade your setup: pair ${product} with X`,
    ]},
  ];
};

export const PROMPT_TEMPLATES_EN: PromptTemplate[] = [
  {
    id: "product_ads_hvc_v1",
    locale: "en",
    useCase: "product_ads",
    framework: "hook_value_cta",
    name: "Product Ad (Hook → Value → CTA)",
    description: "Product images + benefits → ad script + storyboard + video prompt.",
    fields: [
      { key: "productName", label: "Product name", type: "text", required: true },
      { key: "targetAudience", label: "Target audience", type: "text", required: true },
      { key: "benefits", label: "Key benefits (3–5)", type: "tags", required: true },
      { key: "platform", label: "Platform", type: "select", required: true, options: ["TikTok/Reels/Shorts (9:16)", "YouTube (16:9)"] },
      { key: "style", label: "Style", type: "select", required: true, options: ["UGC", "Luxury", "Minimal", "Tech", "Cute"] },
      { key: "cta", label: "CTA", type: "text", required: true, placeholder: "Shop now / Learn more / Limited offer" },
    ],
    build: (input) => {
      const product = asStr(input.productName);
      const audience = asStr(input.targetAudience);
      const benefits = pick(asArr(input.benefits), 5);
      const style = asStr(input.style) || "UGC";
      const cta = asStr(input.cta) || "Shop now";
      const ratio = asStr(input.platform).includes("16:9") ? "16:9" : "9:16";

      const positioningLine = `${product} for ${audience}: ${benefits[0] ?? "a clear benefit"}.`;
      const calendar4x4 = build4x4(product, audience, benefits);

      const hook = `Stop scrolling — ${product} made for ${audience}.`;
      const valuePoints = benefits.length ? benefits : ["Benefit #1", "Benefit #2", "Benefit #3"];
      const proof = `Social proof: “People love it for ${valuePoints[0]}” (replace with real proof if available).`;

      const shotList = [
        `Shot 1 (0–2s): Hero close-up of ${product}, premium lighting, ${style} vibe, smooth camera move.`,
        `Shot 2 (2–5s): Visualize the problem ${audience} faces, then reveal ${product}.`,
        `Shot 3 (5–9s): Feature highlights: ${valuePoints.slice(0,3).join(" / ")}.`,
        `Shot 4 (9–12s): Lifestyle use-case for ${audience}, natural hand interaction, satisfying motion.`,
        `Shot 5 (12–15s): Clean packshot end frame, no baked-in text.`,
      ];

      const onScreenText = [
        `Made for ${audience}`,
        valuePoints[0] ?? "Benefit #1",
        valuePoints[1] ?? "Benefit #2",
        valuePoints[2] ?? "Benefit #3",
        cta,
      ];

      const videoPrompt = [
        `Create a ${ratio} short video ad for "${product}".`,
        `Style: ${style}. Audience: ${audience}.`,
        `Key benefits: ${valuePoints.join(", ")}.`,
        `Structure: Hook → Value → CTA.`,
        `Storyboard:`,
        ...shotList.map(s => `- ${s}`),
        `No subtitles or text rendered inside the video.`,
        `Realistic motion, stable product appearance, smooth transitions.`,
      ].join("\n");

      return {
        positioningLine,
        angles: calendar4x4.flatMap(x => x.angles),
        calendar4x4,
        script: { hook, valuePoints, proof, cta, onScreenText, shotList },
        videoPrompt,
        negativePrompt: baseNegative,
        metadata: { ratio: ratio as any, durationSeconds: 15, resolution: "1080p", outputNumber: 1, generateAudio: false },
      };
    },
  },

  {
    id: "app_promo_aida_v1",
    locale: "en",
    useCase: "app_promo",
    framework: "aida",
    name: "App Promo (AIDA)",
    description: "App value prop → AIDA script + storyboard prompt.",
    fields: [
      { key: "appName", label: "App name", type: "text", required: true },
      { key: "targetAudience", label: "Target audience", type: "text", required: true },
      { key: "pain", label: "Main pain", type: "text", required: true },
      { key: "benefits", label: "Key benefits (3–5)", type: "tags", required: true },
      { key: "cta", label: "CTA", type: "text", required: true, placeholder: "Download / Try free / Join now" },
    ],
    build: (input) => {
      const app = asStr(input.appName);
      const audience = asStr(input.targetAudience);
      const pain = asStr(input.pain);
      const benefits = pick(asArr(input.benefits), 5);
      const cta = asStr(input.cta) || "Try free";
      const ratio = "9:16";

      const positioningLine = `${app}: ${benefits[0] ?? "a key benefit"} for ${audience}.`;
      const calendar4x4 = build4x4(app, audience, benefits);

      const hook = `If you’re ${audience}, this fixes "${pain}".`;
      const valuePoints = benefits.length ? benefits : ["Benefit #1", "Benefit #2", "Benefit #3"];
      const proof = `Proof: show UI snippets + a believable testimonial (no fake numbers).`;

      const shotList = [
        `Shot 1 (0–2s): Bold hook text overlay (added later), dynamic background, attention-grabbing.`,
        `Shot 2 (2–6s): Show pain visually (before) then transition to app UI (after).`,
        `Shot 3 (6–10s): 2–3 feature highlights (screen-like visuals, clean modern style).`,
        `Shot 4 (10–13s): Outcome: what changes for ${audience}.`,
        `Shot 5 (13–15s): End frame with brand vibe, no baked-in text.`,
      ];

      const onScreenText = [
        `Fix: ${pain}`,
        valuePoints[0] ?? "Feature #1",
        valuePoints[1] ?? "Feature #2",
        `Made for ${audience}`,
        cta,
      ];

      const videoPrompt = [
        `Create a ${ratio} short app promo video for "${app}".`,
        `Audience: ${audience}. Pain: ${pain}.`,
        `Benefits: ${valuePoints.join(", ")}.`,
        `Style: modern, clean, energetic, tech UI vibe.`,
        `Storyboard:`,
        ...shotList.map(s => `- ${s}`),
        `No text rendered inside video.`,
        `Smooth transitions, stable visuals, crisp motion.`,
      ].join("\n");

      return {
        positioningLine,
        angles: calendar4x4.flatMap(x => x.angles),
        calendar4x4,
        script: { hook, valuePoints, proof, cta, onScreenText, shotList },
        videoPrompt,
        negativePrompt: baseNegative,
        metadata: { ratio, durationSeconds: 15, resolution: "1080p", outputNumber: 1, generateAudio: false },
      };
    },
  },
];
```

### 7.3 templates.zh.ts（创建，先做关键模板）

* 把 EN 模板翻译成中文字段 label + 输出文案
* 中文版重点面向 /zh 使用（但海外站默认 /en）

---

## 8. 最小回归清单（每个 Ticket 必跑）

1. 首页（/en）加载：无占位符数据、CTA 正常
2. Footer：Privacy/Terms/Cookies/Contact 全可点开
3. Pricing：订阅与 credits packs 信息清晰
4. 生成器：Text/Image/Reference（或 Reference Image）可打开，文案语言正确
5. Credits 解释器可弹出，计算合理
6. 登录（Google/Magic link）可走通（如已配置）
7. 创建任务 → 状态更新 → 生成完成 → My Creations 可见
8. 下载/分享/Remix（若已完成相关 Ticket）
9. Webhook（本地/测试模式）重放不重复入账

---

## 9. Definition of Done（DoD）

P0 全过 + P1 至少完成：

* Product-to-Video Ads 工具页
* Prompt Studio V1（无 LLM）
* Batch Variations（真正差异化变体）
* Share + Remix（留存传播）
  并且：
* 没有 404
* 没有占位符/虚假数据
* i18n 完整
* webhook/callback 验签与幂等到位
