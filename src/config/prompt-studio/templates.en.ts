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
  const b1 = benefits[0] ?? "your #1 benefit";
  const b2 = benefits[1] ?? "your #2 benefit";
  const b3 = benefits[2] ?? "your #3 benefit";

  return [
    {
      stage: "Acquire" as const,
      angles: [
        `Stop scrolling: ${product} for ${audience}`,
        `3 signs you need ${product}`,
        `The ${audience} hack nobody tells you`,
        `POV: You discover ${product} and it changes your routine`,
      ],
    },
    {
      stage: "Trust" as const,
      angles: [
        `Why ${product} works (simple explanation)`,
        `Before/After story (no fake claims) + ${b1}`,
        `Behind the scenes: how ${product} is made / designed`,
        `Common mistakes ${audience} makes - fix with ${product}`,
      ],
    },
    {
      stage: "Convert" as const,
      angles: [
        `Limited offer: get ${b1} today`,
        `Compare: ${product} vs alternatives (honest)`,
        `Unboxing + first impression + ${b2}`,
        `FAQ: does it work for ${audience}? (${b3})`,
      ],
    },
    {
      stage: "Retain" as const,
      angles: [
        `How to get the best results with ${product}`,
        `3 ways to use ${product} (quick tips)`,
        `My weekly routine with ${product}`,
        `Upgrade your setup: pair ${product} with X`,
      ],
    },
  ];
};

export const PROMPT_TEMPLATES_EN: PromptTemplate[] = [
  {
    id: "product_ads_hvc_v1",
    locale: "en",
    useCase: "product_ads",
    framework: "hook_value_cta",
    name: "Product Ad (Hook -> Value -> CTA)",
    description: "Product images + benefits -> ad script + storyboard + video prompt.",
    fields: [
      { key: "productName", label: "Product name", type: "text", required: true },
      { key: "targetAudience", label: "Target audience", type: "text", required: true },
      { key: "benefits", label: "Key benefits (3-5)", type: "tags", required: true },
      {
        key: "platform",
        label: "Platform",
        type: "select",
        required: true,
        options: ["TikTok/Reels/Shorts (9:16)", "YouTube (16:9)"],
      },
      {
        key: "style",
        label: "Style",
        type: "select",
        required: true,
        options: ["UGC", "Luxury", "Minimal", "Tech", "Cute"],
      },
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

      const hook = `Stop scrolling - ${product} made for ${audience}.`;
      const valuePoints = benefits.length ? benefits : ["Benefit #1", "Benefit #2", "Benefit #3"];
      const proof = `Social proof: \"People love it for ${valuePoints[0]}\" (replace with real proof if available).`;

      const shotList = [
        `Shot 1 (0-2s): Hero close-up of ${product}, premium lighting, ${style} vibe, smooth camera move.`,
        `Shot 2 (2-5s): Visualize the problem ${audience} faces, then reveal ${product}.`,
        `Shot 3 (5-9s): Feature highlights: ${valuePoints.slice(0, 3).join(" / ")}.`,
        `Shot 4 (9-12s): Lifestyle use-case for ${audience}, natural hand interaction, satisfying motion.`,
        `Shot 5 (12-15s): Clean packshot end frame, no baked-in text.`,
      ];

      const onScreenText = [
        `Made for ${audience}`,
        valuePoints[0] ?? "Benefit #1",
        valuePoints[1] ?? "Benefit #2",
        valuePoints[2] ?? "Benefit #3",
        cta,
      ];

      const videoPrompt = [
        `Create a ${ratio} short video ad for \"${product}\".`,
        `Style: ${style}. Audience: ${audience}.`,
        `Key benefits: ${valuePoints.join(", ")}.`,
        "Structure: Hook -> Value -> CTA.",
        "Storyboard:",
        ...shotList.map((s) => `- ${s}`),
        "No subtitles or text rendered inside the video.",
        "Realistic motion, stable product appearance, smooth transitions.",
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
    locale: "en",
    useCase: "app_promo",
    framework: "aida",
    name: "App Promo (AIDA)",
    description: "App value prop -> AIDA script + storyboard prompt.",
    fields: [
      { key: "appName", label: "App name", type: "text", required: true },
      { key: "targetAudience", label: "Target audience", type: "text", required: true },
      { key: "pain", label: "Main pain", type: "text", required: true },
      { key: "benefits", label: "Key benefits (3-5)", type: "tags", required: true },
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

      const hook = `If you're ${audience}, this fixes \"${pain}\".`;
      const valuePoints = benefits.length ? benefits : ["Benefit #1", "Benefit #2", "Benefit #3"];
      const proof = "Proof: show UI snippets + a believable testimonial (no fake numbers).";

      const shotList = [
        "Shot 1 (0-2s): Bold hook text overlay (added later), dynamic background, attention-grabbing.",
        "Shot 2 (2-6s): Show pain visually (before) then transition to app UI (after).",
        "Shot 3 (6-10s): 2-3 feature highlights (screen-like visuals, clean modern style).",
        `Shot 4 (10-13s): Outcome: what changes for ${audience}.`,
        "Shot 5 (13-15s): End frame with brand vibe, no baked-in text.",
      ];

      const onScreenText = [
        `Fix: ${pain}`,
        valuePoints[0] ?? "Feature #1",
        valuePoints[1] ?? "Feature #2",
        `Made for ${audience}`,
        cta,
      ];

      const videoPrompt = [
        `Create a ${ratio} short app promo video for \"${app}\".`,
        `Audience: ${audience}. Pain: ${pain}.`,
        `Benefits: ${valuePoints.join(", ")}.`,
        "Style: modern, clean, energetic, tech UI vibe.",
        "Storyboard:",
        ...shotList.map((s) => `- ${s}`),
        "No text rendered inside video.",
        "Smooth transitions, stable visuals, crisp motion.",
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
