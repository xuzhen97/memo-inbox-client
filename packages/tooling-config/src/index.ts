import { fileURLToPath } from "node:url";

export { default as tailwindPreset } from "./tailwind-preset";
export { createBaseViteConfig } from "./vite.base";

export const postcssConfigPath = fileURLToPath(new URL("./postcss.cjs", import.meta.url));
