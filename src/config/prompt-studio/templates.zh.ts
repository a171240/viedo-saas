import type { PromptTemplate } from "./types";

const asArr = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).map(String) : []);
const asStr = (v: unknown) => String(v ?? "").trim();
const pick = (arr: string[], n: number) => arr.slice(0, n);

const baseNegative = [
  "blurry",
  "low quality",
  "watermark",
  "text artifacts",
  "logo distortion",
  "extra limbs",
  "flicker",
  "jitter",
  "warped product",
  "deformed hands",
].join(", ");

const build4x4 = (product: string, audience: string, benefits: string[]) => {
  const b1 = benefits[0] ?? "核心卖点";
  const b2 = benefits[1] ?? "第二卖点";
  const b3 = benefits[2] ?? "第三卖点";

  return [
    {
      stage: "Acquire" as const,
      angles: [
        `别划走：${product} 专为 ${audience}`,
        `你需要 ${product} 的 3 个信号`,
        `${audience} 都在用的小技巧`,
        `POV：你发现 ${product} 后的日常变化`,
      ],
    },
    {
      stage: "Trust" as const,
      angles: [
        `${product} 为什么有效（简单解释）`,
        `前后对比（真实，不夸张）+ ${b1}`,
        `幕后揭秘：${product} 如何被设计/制造`,
        `${audience} 常见误区：用 ${product} 解决`,
      ],
    },
    {
      stage: "Convert" as const,
      angles: [
        `限时机会：今天就拿到 ${b1}`,
        `对比：${product} vs 其他方案（真实）`,
        `开箱 + 第一印象 + ${b2}`,
        `FAQ：${audience} 适合吗？（${b3}）`,
      ],
    },
    {
      stage: "Retain" as const,
      angles: [
        `让 ${product} 效果更好的使用方式`,
        `3 种用法（快速技巧）`,
        `我每周如何用 ${product}`,
        `搭配升级：${product} + X`,
      ],
    },
  ];
};

export const PROMPT_TEMPLATES_ZH: PromptTemplate[] = [
  {
    id: "product_ads_hvc_v1",
    locale: "zh",
    useCase: "product_ads",
    framework: "hook_value_cta",
    name: "商品广告（吸引 → 价值 → CTA）",
    description: "商品图 + 卖点 → 广告脚本 + 分镜 + 视频提示词",
    fields: [
      { key: "productName", label: "产品名称", type: "text", required: true },
      { key: "targetAudience", label: "目标受众", type: "text", required: true },
      { key: "benefits", label: "核心卖点（3-5）", type: "tags", required: true },
      {
        key: "platform",
        label: "平台",
        type: "select",
        required: true,
        options: ["TikTok/Reels/Shorts (9:16)", "YouTube (16:9)"],
      },
      {
        key: "style",
        label: "风格",
        type: "select",
        required: true,
        options: ["UGC", "Luxury", "Minimal", "Tech", "Cute"],
      },
      { key: "cta", label: "CTA", type: "text", required: true, placeholder: "立即购买 / 了解更多 / 限时优惠" },
    ],
    build: (input) => {
      const product = asStr(input.productName);
      const audience = asStr(input.targetAudience);
      const benefits = pick(asArr(input.benefits), 5);
      const style = asStr(input.style) || "UGC";
      const cta = asStr(input.cta) || "立即购买";
      const ratio = asStr(input.platform).includes("16:9") ? "16:9" : "9:16";

      const positioningLine = `${product} 为 ${audience} 带来：${benefits[0] ?? "清晰卖点"}.`;
      const calendar4x4 = build4x4(product, audience, benefits);

      const hook = `别划走 — ${product} 专为 ${audience} 打造。`;
      const valuePoints = benefits.length ? benefits : ["卖点 1", "卖点 2", "卖点 3"];
      const proof = `社会证明：“大家都喜欢它的 ${valuePoints[0]}”（请替换为真实证明）。`;

      const shotList = [
        `镜头 1（0-2s）：${product} 特写，质感光影，${style} 风格，平滑镜头移动。`,
        `镜头 2（2-5s）：呈现 ${audience} 的问题场景，再切到 ${product}。`,
        `镜头 3（5-9s）：卖点展示：${valuePoints.slice(0, 3).join(" / ")}。`,
        `镜头 4（9-12s）：${audience} 使用场景，手部交互自然，动作顺滑。`,
        "镜头 5（12-15s）：干净包装收尾画面，不要内嵌文字。",
      ];

      const onScreenText = [
        `为 ${audience} 打造`,
        valuePoints[0] ?? "卖点 1",
        valuePoints[1] ?? "卖点 2",
        valuePoints[2] ?? "卖点 3",
        cta,
      ];

      const videoPrompt = [
        `生成 ${ratio} 比例的短视频广告，产品为「${product}」。`,
        `风格：${style}。受众：${audience}。`,
        `核心卖点：${valuePoints.join("，")}。`,
        "结构：吸引 → 价值 → CTA。",
        "分镜：",
        ...shotList.map((s) => `- ${s}`),
        "视频内不要渲染字幕或文字。",
        "真实动感，产品形态稳定，转场平滑。",
      ].join("\n");

      return {
        positioningLine,
        angles: calendar4x4.flatMap((x) => x.angles),
        calendar4x4,
        script: { hook, valuePoints, proof, cta, onScreenText, shotList },
        videoPrompt,
        negativePrompt: baseNegative,
        metadata: {
          ratio: ratio as "9:16" | "16:9",
          durationSeconds: 15,
          resolution: "1080p",
          outputNumber: 1,
          generateAudio: false,
        },
      };
    },
  },
  {
    id: "app_promo_aida_v1",
    locale: "zh",
    useCase: "app_promo",
    framework: "aida",
    name: "应用推广（AIDA）",
    description: "产品价值点 → AIDA 脚本 + 分镜提示词",
    fields: [
      { key: "appName", label: "应用名称", type: "text", required: true },
      { key: "targetAudience", label: "目标受众", type: "text", required: true },
      { key: "pain", label: "核心痛点", type: "text", required: true },
      { key: "benefits", label: "关键卖点（3-5）", type: "tags", required: true },
      { key: "cta", label: "CTA", type: "text", required: true, placeholder: "立即下载 / 免费试用 / 现在加入" },
    ],
    build: (input) => {
      const app = asStr(input.appName);
      const audience = asStr(input.targetAudience);
      const pain = asStr(input.pain);
      const benefits = pick(asArr(input.benefits), 5);
      const cta = asStr(input.cta) || "免费试用";
      const ratio = "9:16";

      const positioningLine = `${app}：为 ${audience} 提供 ${benefits[0] ?? "关键价值"}.`;
      const calendar4x4 = build4x4(app, audience, benefits);

      const hook = `如果你是 ${audience}，这个问题「${pain}」可以被解决。`;
      const valuePoints = benefits.length ? benefits : ["卖点 1", "卖点 2", "卖点 3"];
      const proof = "证明：展示 UI 或真实用户反馈（不使用虚假数据）。";

      const shotList = [
        "镜头 1（0-2s）：强吸引开场，后期加字（不要直接烘焙进视频）。",
        "镜头 2（2-6s）：痛点前后对比，从问题到解决方案。",
        "镜头 3（6-10s）：2-3 个功能亮点（干净、现代的 UI 视觉）。",
        `镜头 4（10-13s）：${audience} 的改变结果。`,
        "镜头 5（13-15s）：品牌感收尾画面，不要内嵌文字。",
      ];

      const onScreenText = [
        `解决：${pain}`,
        valuePoints[0] ?? "卖点 1",
        valuePoints[1] ?? "卖点 2",
        `为 ${audience} 打造`,
        cta,
      ];

      const videoPrompt = [
        `生成 ${ratio} 的应用推广短视频，产品为「${app}」。`,
        `受众：${audience}。痛点：${pain}。`,
        `卖点：${valuePoints.join("，")}。`,
        "风格：现代、干净、节奏感强、科技 UI 质感。",
        "分镜：",
        ...shotList.map((s) => `- ${s}`),
        "视频内不要渲染字幕或文字。",
        "转场顺滑，画面稳定清晰。",
      ].join("\n");

      return {
        positioningLine,
        angles: calendar4x4.flatMap((x) => x.angles),
        calendar4x4,
        script: { hook, valuePoints, proof, cta, onScreenText, shotList },
        videoPrompt,
        negativePrompt: baseNegative,
        metadata: {
          ratio,
          durationSeconds: 15,
          resolution: "1080p",
          outputNumber: 1,
          generateAudio: false,
        },
      };
    },
  },
];
