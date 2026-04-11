import { defineConfig, mergeConfig } from "vite";

import { createBaseViteConfig } from "../../packages/tooling-config/src/vite.base";

export default mergeConfig(
  createBaseViteConfig(),
  defineConfig({
    server: {
      port: 4175
    }
  })
);
