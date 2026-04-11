import type { Config } from "tailwindcss";

import tailwindPreset from "../../packages/tooling-config/src/tailwind-preset";

export default {
  presets: [
    tailwindPreset
  ],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/app-core/src/**/*.{ts,tsx}"
  ]
} satisfies Config;
