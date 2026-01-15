import type { Config } from "tailwindcss";

import baseConfig from "@videofly/tailwind-config";

export default {
  content: [
    ...baseConfig.content,
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/video-generator/src/**/*.{ts,tsx}",
  ],
  presets: [baseConfig],
} satisfies Config;
