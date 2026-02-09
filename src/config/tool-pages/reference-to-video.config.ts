import { ToolPageConfig } from "./types";

/**
 * Reference Image to Video 工具页面配置
 */
export const referenceToVideoConfig: ToolPageConfig = {
  // SEO 配置
  seo: {
    title: "Reference Image to Video - Animate Images with AI",
    description: "Upload a reference image and turn it into a video with AI. Keep the core subject, change style, add effects, or create multiple variations.",
    keywords: [
      "reference image to video",
      "image to video",
      "ai image animation",
      "image restyle",
      "video variation",
      "ai video generation",
    ],
    ogImage: "/og-reference-to-video.jpg",
  },

  // 生成器配置
  generator: {
    mode: "reference-to-video",
    uiMode: "compact",

    defaults: {
      model: "wan2.6",
      duration: 10,
      aspectRatio: "same-as-original",
      outputNumber: 1,
    },

    models: {
      available: ["wan2.6"],
      default: "wan2.6",
    },

    features: {
      showImageUpload: true, // 用于上传参考图片
      showPromptInput: true,
      showModeSelector: false,
    },

    promptPlaceholder: "Describe how you want to animate the image... e.g., 'Add gentle camera push-in, cinematic lighting'",

    settings: {
      showDuration: false, // 使用原始视频时长
      showAspectRatio: true, // 可以保持原始或修改
      showQuality: false,
      showOutputNumber: false,
      showAudioGeneration: false,

      aspectRatios: ["same-as-original", "16:9", "9:16", "1:1", "4:3"],
    },
  },

  // Landing Page 配置
  landing: {
    hero: {
      title: "Turn Reference Images into Videos",
      description: "Upload a reference image and let AI animate it with style changes, effects, or variations while keeping the subject consistent.",
      ctaText: "Try It Now",
      ctaSubtext: "50 free credits to start",
    },

    examples: [
      {
        title: "Style Transfer",
        prompt: "Transform the image into anime style with vibrant colors",
        thumbnail: "/images/showcase/abstract.jpg",
        videoUrl: "/videos/showcase/abstract.mp4",
      },
      {
        title: "Add Weather Effects",
        prompt: "Add rain and fog atmosphere to the scene",
        thumbnail: "/images/showcase/urban.jpg",
        videoUrl: "/videos/showcase/urban.mp4",
      },
      {
        title: "Change Season",
        prompt: "Convert summer scene to winter with snow",
        thumbnail: "/images/showcase/nature.jpg",
        videoUrl: "/videos/showcase/nature.mp4",
      },
    ],

    features: [
      "Upload reference images (JPG, PNG, WEBP up to 10MB)",
      "AI-powered image animation and stylization",
      "Maintain core subject identity and composition",
      "Create multiple variations from one reference",
      "Support for various artistic styles and effects",
    ],

    supportedModels: [
      { name: "Wan 2.6", provider: "Alibaba", color: "#8b5cf6" },
    ],
  },

  // 多语言 key 前缀
  i18nPrefix: "ToolPage.ReferenceToVideo",
};
