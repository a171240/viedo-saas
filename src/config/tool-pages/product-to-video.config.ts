import type { ToolPageConfig } from "./types";

/**
 * Product to Video Ads tool page configuration
 */
export const productToVideoConfig: ToolPageConfig = {
  seo: {
    title: "Product to Video Ads - Turn Images into Short-form Ads",
    description: "Turn product images into TikTok-ready video ads in minutes. Built for DTC and ecommerce teams.",
    keywords: [
      "product to video",
      "product video ads",
      "tiktok video ads",
      "ecommerce video ads",
      "ai video ads",
    ],
    ogImage: "/og-product-to-video.jpg",
  },

  generator: {
    mode: "image-to-video",
    uiMode: "compact",
    defaults: {
      model: "wan2.6",
      duration: 10,
      aspectRatio: "9:16",
      outputNumber: 1,
    },
    models: {
      available: ["wan2.6", "seedance-1.5-pro", "sora-2", "veo-3.1"],
      default: "wan2.6",
    },
    features: {
      showImageUpload: true,
      showPromptInput: true,
      showModeSelector: false,
    },
    promptPlaceholder: "Describe your product ad idea...",
    settings: {
      showDuration: true,
      showAspectRatio: true,
      showQuality: false,
      showOutputNumber: false,
      showAudioGeneration: false,
      durations: [5, 10, 15],
      aspectRatios: ["9:16", "16:9", "1:1", "4:3", "3:4"],
    },
  },

  landing: {
    hero: {
      title: "Turn product images into TikTok-ready video ads",
      description: "Script -> Storyboard -> Variations -> Generate. Launch scroll-stopping ads in minutes.",
      ctaText: "Start Creating",
      ctaSubtext: "50 free credits to try",
    },
    examples: [
      {
        thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
        title: "Minimal Watch Ad",
        prompt: "Clean product shots, smooth rotations, crisp lighting",
      },
      {
        thumbnail: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=600&q=80",
        title: "Streetwear Drop",
        prompt: "UGC style, fast cuts, bold lifestyle scenes",
      },
      {
        thumbnail: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=80",
        title: "Skincare Highlight",
        prompt: "Soft light, close-up texture, clean packshot",
      },
    ],
    features: [
      "Upload 1-3 product images",
      "Auto-generate ad script + storyboard prompt",
      "Optimized for 9:16 short-form platforms",
      "Batch variations with different hooks",
      "Commercial use ready outputs",
    ],
    supportedModels: [
      { name: "Wan 2.6", provider: "Alibaba", color: "#8b5cf6" },
      { name: "Seedance 1.5", provider: "ByteDance", color: "#ec4899" },
      { name: "Sora 2", provider: "OpenAI", color: "#000000" },
      { name: "Veo 3.1", provider: "Google", color: "#4285f4" },
    ],
  },

  i18nPrefix: "ToolPage.ProductToVideo",
};
